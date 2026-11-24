"""Pure route geometry and edge-time sampling."""
import math
from datetime import timedelta

MILE = 1609.344


def distance(a, b):
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, math.radians(b[0] - a[0])
    return 6371000 * 2 * math.asin(min(1, math.sqrt(math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2)))


def checkpoints(route, spacing, departure):
    coords = route['geometry']['coordinates']
    durations = [v for leg in route['legs'] for v in leg['annotation']['duration']]
    lengths = [distance(a, b) for a, b in zip(coords, coords[1:])]
    total = sum(lengths)
    # Scale geometry arc lengths to API road distance; time comes from edge annotations.
    scale = route['distance'] / total if total else 1
    lengths = [d * scale for d in lengths]
    targets = [i * spacing * MILE for i in range(math.ceil(route['distance'] / (spacing * MILE)))] + [route['distance']]
    output = []
    edge, traveled, elapsed = 0, 0.0, 0.0
    for target in targets:
        while edge < len(lengths) - 1 and traveled + lengths[edge] < target:
            traveled += lengths[edge]
            elapsed += durations[edge]
            edge += 1
        ratio = min(1, max(0, (target - traveled) / lengths[edge])) if lengths[edge] else 0
        a, b = coords[edge], coords[edge + 1]
        output.append({'lat': a[1] + (b[1] - a[1]) * ratio, 'lng': a[0] + (b[0] - a[0]) * ratio,
                       'mile': target / MILE, 'eta': (departure + timedelta(seconds=elapsed + durations[edge] * ratio)).isoformat()})
    return output
