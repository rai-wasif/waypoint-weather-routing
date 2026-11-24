from datetime import datetime, timezone
from unittest.mock import patch
from django.test import SimpleTestCase
from .risk import classify, summarize, ranking
from .service import checkpoints, weather_at, ProviderError, MILE, build_plan


class RiskTests(SimpleTestCase):
    def test_wind_boundaries(self):
        for wind, score in [(24.99, 0), (25, 1), (34.99, 1), (35, 2), (44.99, 2), (45, 3), (54.99, 3), (55, 4)]:
            with self.subTest(wind=wind):
                self.assertEqual(classify(wind, 0, 0, 0)['score'], score)

    def test_load_boundaries(self):
        for wind, load, expected in [(45, 30000, 3), (45, 30001, 4), (35, 40000, 2), (35, 40001, 3), (55, 0, 4), (25, 80000, 1)]:
            self.assertEqual(classify(wind, 0, 0, load)['score'], expected)

    def test_precipitation_boundaries(self):
        for value, score in [(0.099, 0), (.1, 1), (.25, 2), (.5, 3), (1, 3), (1.001, 4)]:
            self.assertEqual(classify(0, value, 0, 0)['score'], score)
        for value, score in [(.499, 0), (.5, 1), (1, 2), (2, 3), (3, 3), (3.001, 4)]:
            self.assertEqual(classify(0, 0, value, 0)['score'], score)

    def test_worst_condition_wins(self):
        self.assertEqual(classify(10, .6, 0, 0)['reasons'], ['Rain'])

    def test_segment_conservation(self):
        points = [{'mile': mile, 'risk': {'score': score}} for mile, score in [(0, 0), (25, 2), (50, 3), (62, 0)]]
        s = summarize(points, 62, 3600)
        self.assertEqual(s['risk_miles'], [0, 0, 25, 37, 0])
        self.assertAlmostEqual(s['average_risk'], (25 * 2 + 37 * 3) / 62)

    def test_ranking_prioritizes_severe_over_speed(self):
        def route(miles, average, seconds, blocked=False):
            return {'summary': {'risk_miles': miles, 'average_risk': average, 'duration_seconds': seconds, 'blocked': blocked}}
        safe = route([10, 0, 20, 0, 0], 1.3, 5000)
        severe = route([29, 0, 0, 1, 0], .1, 1000)
        blocked = route([30, 0, 0, 0, 1], .01, 10, True)
        self.assertEqual(sorted([blocked, severe, safe], key=ranking), [safe, severe, blocked])

    def test_high_average_and_time_tie_breakers(self):
        def key(high, average, seconds):
            return ranking({'summary': {'blocked': False, 'risk_miles': [0, 0, high, 0, 0], 'average_risk': average, 'duration_seconds': seconds}})
        self.assertLess(key(0, 1, 10000), key(10, .2, 1000))
        self.assertLess(key(0, .2, 10000), key(0, 1, 1000))
        self.assertLess(key(0, .2, 1000), key(0, .2, 10000))


class SamplingTests(SimpleTestCase):
    def test_samples_endpoints_and_edge_time(self):
        r = {'distance': 60 * MILE, 'geometry': {'coordinates': [[0, 0], [.5, 0], [1, 0]]}, 'legs': [{'annotation': {'duration': [600, 1800]}}]}
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        points = checkpoints(r, 25, start)
        self.assertEqual([round(p['mile']) for p in points], [0, 25, 50, 60])
        self.assertEqual(datetime.fromisoformat(points[-1]['eta']).timestamp() - start.timestamp(), 2400)
        self.assertAlmostEqual(datetime.fromisoformat(points[1]['eta']).timestamp() - start.timestamp(), 500)

    def test_forecast_units_and_horizon(self):
        hourly = {'time': ['2026-01-01T00:00', '2026-01-01T01:00'], 'wind_speed_10m': [10, 20], 'rain': [0, .1], 'snowfall': [0, 2.54], '_units': {'snowfall': 'cm'}}
        self.assertEqual(weather_at(hourly, datetime(2026, 1, 1, 1, 30, tzinfo=timezone.utc)), {'wind': 20, 'rain': .1, 'snow': 1})
        with self.assertRaises(ProviderError):
            weather_at(hourly, datetime(2026, 1, 2, tzinfo=timezone.utc))

    def test_imperial_snow_is_not_converted_twice(self):
        hourly = {'time': ['2026-01-01T00:00'], 'wind_speed_10m': [10], 'rain': [.1], 'showers': [.2], 'snowfall': [1], '_units': {'snowfall': 'inch'}}
        result = weather_at(hourly, datetime(2026, 1, 1, tzinfo=timezone.utc))
        self.assertEqual(result['snow'], 1)
        self.assertAlmostEqual(result['rain'], .3)


class ApiTests(SimpleTestCase):
    def test_health(self):
        self.assertEqual(self.client.get('/api/health/').json(), {'status': 'ok'})

    def test_rejects_bad_requests(self):
        for body in ['{', '[]', '{}', '{"origin":"Chicago","destination":"Columbus","load":-1}']:
            self.assertEqual(self.client.post('/api/plan/', body, content_type='application/json').status_code, 400)

    @patch('routing.views.build_plan', side_effect=ProviderError('Provider unavailable'))
    def test_provider_failure_is_actionable(self, mock):
        response = self.client.post('/api/plan/', {'origin': 'Chicago', 'destination': 'Columbus', 'load': 32000, 'spacing': 25, 'departure': datetime.now(timezone.utc).isoformat()}, content_type='application/json')
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()['error'], 'Provider unavailable')


class PlanIntegrationTests(SimpleTestCase):
    @patch('routing.service.forecast')
    @patch('routing.service.get_routes')
    @patch('routing.service.geocode')
    def test_no_recommendation_when_all_routes_are_blocked(self, geocode, routes, forecast):
        from datetime import timedelta
        geocode.side_effect = lambda name: {'name': name, 'lat': 40, 'lng': -88 if name == 'A' else -87}
        routes.return_value = [{'distance': 60 * MILE, 'duration': 3600, 'geometry': {'coordinates': [[-88, 40], [-87, 40]]}, 'legs': [{'annotation': {'duration': [3600]}}]} for _ in range(3)]
        start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        times = [(start + timedelta(hours=h)).strftime('%Y-%m-%dT%H:%M') for h in range(168)]
        hourly = {'time': times, 'wind_speed_10m': [55] * 168, 'rain': [0] * 168, 'snowfall': [0] * 168}
        forecast.side_effect = lambda points: [hourly] * len(points)
        result = build_plan('A', 'B', datetime.now(timezone.utc), 0, 25)
        self.assertIsNone(result['recommended_id'])
        self.assertTrue(all(route['summary']['blocked'] for route in result['routes']))
        self.assertTrue(all(len(cell['hours']) == 49 for cell in result['corridor']))
