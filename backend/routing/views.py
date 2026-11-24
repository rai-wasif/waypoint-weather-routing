import json
import logging
from datetime import datetime, timezone, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from .service import build_plan, ProviderError


@require_GET
def health(request):
    return JsonResponse({'status': 'ok'})


@csrf_exempt  # Stateless calculation endpoint; no cookies or authenticated mutations.
@require_POST
def plan(request):
    try:
        if len(request.body) > 10000:
            raise ValueError('Request is too large.')
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError('Expected a JSON object.')
        origin, destination = (str(data.get(key, '')).strip() for key in ('origin', 'destination'))
        if not (2 <= len(origin) <= 120 and 2 <= len(destination) <= 120):
            raise ValueError('Enter an origin and destination city (2–120 characters).')
        load = float(data.get('load', -1))
        if not 0 <= load <= 80000:
            raise ValueError('Load must be between 0 and 80,000 lb.')
        spacing = int(data.get('spacing', 25))
        if spacing not in (10, 25, 50):
            raise ValueError('Checkpoint spacing must be 10, 25, or 50 miles.')
        departure = datetime.fromisoformat(str(data.get('departure', '')).replace('Z', '+00:00'))
        if departure.tzinfo is None:
            raise ValueError('Departure must include a timezone.')
        now = datetime.now(timezone.utc)
        if not now - timedelta(minutes=10) <= departure <= now + timedelta(days=5):
            raise ValueError('Departure must be within the next five days.')
        return JsonResponse(build_plan(origin, destination, departure, load, spacing))
    except (ValueError, TypeError, OverflowError) as exc:
        return JsonResponse({'error': str(exc) or 'Invalid request.'}, status=400)
    except ProviderError as exc:
        return JsonResponse({'error': str(exc)}, status=502)
    except Exception:
        logging.exception('Route planning failed')
        return JsonResponse({'error': 'Planning failed unexpectedly. Please retry.'}, status=500)
