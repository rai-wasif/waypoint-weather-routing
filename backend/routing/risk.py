"""Assessment thresholds. Boundary overlaps resolve to the more cautious band.

Rain 1.00 and snow 3.00 remain Severe (No Travel is strictly greater).
"""
LEVELS = ['Low', 'Moderate', 'High', 'Severe', 'No Travel']


def classify(wind, rain, snow, load):
    wind_risk = sum(wind >= boundary for boundary in (25, 35, 45, 55))
    rain_risk = 4 if rain > 1 else 3 if rain >= .5 else 2 if rain >= .25 else 1 if rain >= .1 else 0
    snow_risk = 4 if snow > 3 else 3 if snow >= 2 else 2 if snow >= 1 else 1 if snow >= .5 else 0
    if wind >= 45 and load > 30000:
        wind_risk = 4
    elif wind >= 35 and load > 40000:
        wind_risk = max(wind_risk, 3)
    scores = {'Wind': wind_risk, 'Rain': rain_risk, 'Snow': snow_risk}
    score = max(scores.values())
    return {'score': score, 'level': LEVELS[score], 'reasons': [key for key, value in scores.items() if value == score and score > 0]}


def summarize(checkpoints, miles, seconds):
    exposure = [0.0] * 5
    for left, right in zip(checkpoints, checkpoints[1:]):
        # Conservative segment estimate: the worse endpoint owns the interval.
        exposure[max(left['risk']['score'], right['risk']['score'])] += right['mile'] - left['mile']
    average = sum(i * distance for i, distance in enumerate(exposure)) / miles if miles else 0
    return {'risk_miles': exposure, 'average_risk': average, 'duration_seconds': seconds,
            'distance_miles': miles, 'blocked': exposure[4] > 0,
            'max_risk': max(c['risk']['score'] for c in checkpoints)}


def ranking(route):
    s = route['summary']
    # No Travel routes are never recommended; remaining criteria match the PDF.
    return (s['blocked'], s['risk_miles'][3], s['risk_miles'][2], s['average_risk'], s['duration_seconds'])
