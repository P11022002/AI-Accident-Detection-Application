import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime

# In-memory storage for camera-detected incidents only.
incidents_store = []


def is_within_india(lat, lng):
    return 6.5 <= lat <= 37.1 and 68.0 <= lng <= 97.5


def _set_cors_headers(response):
    # Ensure basic CORS headers on all responses for frontend access during development
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response


@csrf_exempt
@require_http_methods(['GET', 'POST', 'OPTIONS'])
def accidents_view(request):
    """
    Handle GET requests to retrieve all incidents
    Handle POST requests to create new incidents from camera detection
    """
    if request.method == 'OPTIONS':
        response = JsonResponse({'status': 'ok'})
        return _set_cors_headers(response)

    if request.method == 'GET':
        try:
            # Return all incidents (camera-sourced only)
            response = JsonResponse({
                'success': True,
                'count': len(incidents_store),
                'results': incidents_store,
                'timestamp': datetime.now().isoformat()
            })
            return _set_cors_headers(response)
        except Exception as e:
            response = JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
            return _set_cors_headers(response)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Validate required fields
            required_fields = ['title', 'description', 'severity', 'type', 'lat', 'lng', 'source']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }, status=400)

            if data.get('source') != 'camera':
                return JsonResponse({
                    'success': False,
                    'error': 'Only camera-detected incidents are accepted.'
                }, status=400)

            lat = float(data['lat'])
            lng = float(data['lng'])
            if not is_within_india(lat, lng):
                return JsonResponse({
                    'success': False,
                    'error': 'Only current locations inside India are accepted.'
                }, status=400)

            # Create new incident
            # Enforce that the payload is coming from the camera and within India
            new_incident = {
                'id': data.get('id', f'incident-{datetime.now().timestamp()}'),
                'title': data['title'],
                'description': data['description'],
                'severity': min(max(int(data['severity']), 1), 5),
                'type': data['type'],
                'timestamp': data.get('timestamp', datetime.now().isoformat()),
                'lat': lat,
                'lng': lng,
                'location': data.get('location', 'Unknown location'),
                'status': data.get('status', 'active'),
                'objects': data.get('objects', []),
                # collision metadata (time, pixel point, area description) expected from camera
                'collision_time': data.get('collision_time', data.get('timestamp', datetime.now().isoformat())),
                'collision_point': data.get('collision_point'),
                'collision_area': data.get('collision_area'),
                'source': 'camera',
            }

            # Add to store
            incidents_store.insert(0, new_incident)

            response = JsonResponse({
                'success': True,
                'message': 'Incident created successfully',
                'incident': new_incident
            }, status=201)
            return _set_cors_headers(response)

        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
