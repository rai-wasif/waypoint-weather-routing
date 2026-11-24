import math
import hashlib
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import requests
from django.core.cache import cache
from .risk import classify, summarize, ranking

from .geometry import MILE, distance, checkpoints


class ProviderError(Exception):
    pass


def fetch(url, params):
    key = hashlib.sha256((url + json.dumps(params, sort_keys=True)).encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached
    try:
        response = requests.get(url, params=params, timeout=25, headers={'User-Agent': 'WaypointAssessment/1.0'})
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as exc:
        logging.warning('Provider request failed (%s): %s', url.split('/')[2], type(exc).__name__)
        raise ProviderError('A routing or weather provider is unavailable. Please try again shortly or explore the sample trip.') from exc
    cache.set(key, data)
    return data


def geocode(name):
    data = fetch('https://geocoding-api.open-meteo.com/v1/search', {'name': name, 'count': 1, 'language': 'en', 'format': 'json'})
    results = data.get('results', [])
    if not results:
        raise ProviderError(f'Could not find "{name}". Try a city name, such as Chicago.')
    p = results[0]
    return {'name': ', '.join(filter(None, [p['name'], p.get('admin1'), p.get('country_code')])), 'lat': p['latitude'], 'lng': p['longitude']}


def forecast(points):
    # Multi-location requests reduce latency and provider load.
    result = []
    for start in range(0, len(points), 40):
        chunk = points[start:start + 40]
        data = fetch('https://api.open-meteo.com/v1/forecast', {
            'latitude': ','.join(str(round(p['lat'], 4)) for p in chunk),
            'longitude': ','.join(str(round(p['lng'], 4)) for p in chunk),
            'hourly': 'wind_speed_10m,rain,showers,snowfall', 'wind_speed_unit': 'mph',
            'precipitation_unit': 'inch', 'timezone': 'GMT', 'forecast_days': 7})
        result.extend(data if isinstance(data, list) else [data])
    return [dict(entry['hourly'], _units=entry['hourly_units']) for entry in result]


def weather_at(hourly, instant):
    timestamp = instant.astimezone(timezone.utc).replace(tzinfo=None)
    times = [datetime.fromisoformat(t) for t in hourly['time']]
    if timestamp < times[0] or timestamp >= times[-1] + timedelta(hours=1):
        raise ProviderError('This trip extends beyond the available forecast. Choose an earlier departure or shorter route.')
    # Select the containing forecast hour, never a different day's conditions.
    index = max(0, min(len(times) - 1, int((timestamp - times[0]).total_seconds() // 3600)))
    values = [hourly[key][index] for key in ('wind_speed_10m', 'rain', 'snowfall')]
    if any(value is None for value in values):
        raise ProviderError('Weather data is missing at a checkpoint. A safe recommendation cannot be calculated.')
    # Read provider units: snowfall can be cm or inch depending on configuration.
    showers = hourly.get('showers', [0] * len(times))[index]
    if showers is None:
        raise ProviderError('Rain forecast is missing at a checkpoint.')
    units = hourly.get('_units', {})
    snow_unit = units.get('snowfall', 'inch')
    if snow_unit not in ('cm', 'inch') or units.get('rain', 'inch') != 'inch' or units.get('wind_speed_10m', 'mp/h') not in ('mp/h', 'mph'):
        raise ProviderError('The weather provider returned unexpected measurement units.')
    return {'wind': values[0], 'rain': values[1] + showers, 'snow': values[2] / 2.54 if snow_unit == 'cm' else values[2]}


def get_routes(origin, destination):
    def request(via=None):
        points = [origin] + ([via] if via else []) + [destination]
        path = ';'.join(f"{p['lng']},{p['lat']}" for p in points)
        data = fetch('https://router.project-osrm.org/route/v1/driving/' + path,
                     {'alternatives': 'true', 'overview': 'full', 'geometries': 'geojson', 'annotations': 'duration'})
        if data.get('code') != 'Ok':
            raise ProviderError('No road route was found between these locations.')
        return data['routes']
    routes = request()
    # OSRM does not promise three alternatives. Ask for explicit corridor detours.
    for direction in (-1, 1):
        if len(routes) >= 3:
            break
        lat = (origin['lat'] + destination['lat']) / 2
        lng = (origin['lng'] + destination['lng']) / 2
        dx, dy = destination['lng'] - origin['lng'], destination['lat'] - origin['lat']
        norm = math.hypot(dx, dy) or 1
        via = {'lat': lat + direction * dx / norm * .45, 'lng': lng - direction * dy / norm * .45}
        for candidate in request(via):
            if all(abs(candidate['distance'] - existing['distance']) > 1000 for existing in routes):
                candidate['detour'] = True
                routes.append(candidate)
                break
    if len(routes) < 3:
        raise ProviderError('The routing provider could not return three distinct routes for this trip. Try cities farther apart.')
    return routes[:3]


def build_plan(origin_name, destination_name, departure, load, spacing):
    with ThreadPoolExecutor(max_workers=2) as pool:
        origin, destination = list(pool.map(geocode, [origin_name, destination_name]))
    if distance([origin['lng'], origin['lat']], [destination['lng'], destination['lat']]) < 5000:
        raise ValueError('Choose cities at least 3 miles apart.')
    raw = get_routes(origin, destination)
    if any(r['distance'] > 2500 * MILE for r in raw):
        raise ValueError('Please keep routes below 2,500 miles for this assessment service.')
    routes = []
    for index, r in enumerate(raw):
        points = checkpoints(r, spacing, departure)
        routes.append({'id': str(index), 'name': ['Primary corridor', 'Alternative corridor', 'Outer corridor'][index],
                       'via': 'Via an intermediate waypoint' if r.get('detour') else 'Provider alternative',
                       'geometry': r['geometry']['coordinates'], 'checkpoints': points,
                       '_distance': r['distance'], '_duration': r['duration']})
    all_points = [p for r in routes for p in r['checkpoints']]
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    # A bounded grid following all three road corridors, independent of checkpoint spacing.
    corridor = []
    seen = set()
    for route in routes:
        for i in range(5):
            p = route['checkpoints'][round(i * (len(route['checkpoints']) - 1) / 4)]
            for offset in (-.22, 0, .22):
                cell = (round(p['lat'] + offset, 3), round(p['lng'], 3))
                if cell not in seen:
                    corridor.append({'lat': cell[0], 'lng': cell[1]})
                    seen.add(cell)
    weather = forecast(all_points + corridor)
    for p, hourly in zip(all_points, weather):
        p['weather'] = weather_at(hourly, datetime.fromisoformat(p['eta']))
        p['risk'] = classify(**p['weather'], load=load)
    for r in routes:
        r['summary'] = summarize(r['checkpoints'], r.pop('_distance') / MILE, r.pop('_duration'))
    for p, hourly in zip(corridor, weather[len(all_points):]):
        p['hours'] = [classify(**weather_at(hourly, now + timedelta(hours=h)), load=load)['score'] for h in range(49)]
    best = min(routes, key=ranking)
    return {'routes': routes, 'recommended_id': None if best['summary']['blocked'] else best['id'],
            'origin': origin, 'destination': destination, 'corridor': corridor,
            'forecast_start': now.isoformat(), 'source': 'live', 'generated_at': datetime.now(timezone.utc).isoformat()}
