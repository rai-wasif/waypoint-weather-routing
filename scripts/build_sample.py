"""Create a reproducible illustrative fixture; never used as a live API fallback."""
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from routing.geometry import checkpoints, MILE
from routing.risk import classify, summarize

origin = {'name': 'Chicago, Illinois, US', 'lat': 41.8781, 'lng': -87.6298}
destination = {'name': 'Columbus, Ohio, US', 'lat': 39.9612, 'lng': -82.9988}
departure = datetime(2026, 11, 25, 13, tzinfo=timezone.utc)

def simplify(points, tolerance=.0005):
    """Reduce fixture display geometry (~55 m tolerance), preserving road shape."""
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        a, b = points[first], points[last]
        dx, dy = b[0] - a[0], b[1] - a[1]
        denominator = dx * dx + dy * dy
        largest, index = 0, first
        for i in range(first + 1, last):
            p = points[i]
            t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denominator)) if denominator else 0
            squared = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2
            if squared > largest:
                largest, index = squared, i
        if largest > tolerance ** 2:
            keep.add(index)
            stack.extend([(first, index), (index, last)])
    return [points[i] for i in sorted(keep)]

fixture = Path(__file__).resolve().parents[1] / 'sample-routes.json'
if fixture.exists():
    raw = json.loads(fixture.read_text())['routes']
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    import django
    django.setup()
    from routing.service import get_routes
    raw = get_routes(origin, destination)
if len(raw) < 3:
    raise RuntimeError('Three real routes are required for the sample fixture.')
raw = raw[:3]
routes = []
for i, r in enumerate(raw):
    points = checkpoints(r, 25, departure)
    for j, p in enumerate(points):
        wind = [18, 24, 29][i] + (j % 5) * [2, 4, 5][i]
        p['weather'] = {'wind': wind, 'rain': [0.02, 0.12, 0.28][i] if j % 3 else 0, 'snow': 0}
        p['risk'] = classify(**p['weather'], load=32000)
    routes.append({'id': str(i), 'name': ['Primary corridor', 'Alternative corridor', 'Outer corridor'][i],
                   'via': 'Sample routing API geometry', 'geometry': simplify(r['geometry']['coordinates']), 'checkpoints': points,
                   'summary': summarize(points, r['distance'] / MILE, r['duration'])})
corridor = [{'lat': 39.7 + i * .35, 'lng': -87.6 + j * .45,
             'hours': [min(3, max(0, int((j + h / 8 + i) % 12 / 3))) for h in range(49)]} for i in range(7) for j in range(11)]
result = {'routes': routes, 'recommended_id': '0', 'origin': origin, 'destination': destination, 'corridor': corridor,
          'forecast_start': departure.isoformat(), 'source': 'sample', 'generated_at': departure.isoformat()}
target = Path(__file__).resolve().parents[1] / 'frontend/src/sample.json'
target.write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
print(f'Saved {len(routes)} routes to {target.name}')
