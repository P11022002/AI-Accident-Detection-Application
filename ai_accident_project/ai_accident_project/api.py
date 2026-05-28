import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime

# In-memory storage for incidents (replace with database later)
incidents_store = [
    {
        'id': 'A-001',
        'title': 'Multi-vehicle collision',
        'description': 'Heavy traffic collision with possible injuries on the southbound highway.',
        'severity': 4,
        'type': 'Collision',
        'timestamp': '2026-03-27T08:45:00Z',
        'lat': 37.7836,
        'lng': -122.4089,
        'location': 'Market St, San Francisco, CA',
        'status': 'active',
    },
    {
        'id': 'A-002',
        'title': 'Truck rollover',
        'description': 'Commercial truck overturned near the river bridge. Expect delays.',
        'severity': 5,
        'type': 'Rollover',
        'timestamp': '2026-03-27T08:10:00Z',
        'lat': 37.7597,
        'lng': -122.4280,
        'location': 'Hayes Valley, San Francisco, CA',
        'status': 'active',
    },
    {
        'id': 'A-003',
        'title': 'Motorcycle impact',
        'description': 'Single motorcycle incident with emergency response dispatched.',
        'severity': 3,
        'type': 'Motorcycle',
        'timestamp': '2026-03-27T07:34:00Z',
        'lat': 37.7924,
        'lng': -122.4010,
        'location': 'Embarcadero, San Francisco, CA',
        'status': 'active',
    },
]


@csrf_exempt
@require_http_methods(['GET', 'POST', 'OPTIONS'])
def accidents_view(request):
    """
    Handle GET requests to retrieve all incidents
    Handle POST requests to create new incidents from camera detection
    """
    if request.method == 'OPTIONS':
        response = JsonResponse({'status': 'ok'})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    if request.method == 'GET':
        try:
            # Return all incidents
            return JsonResponse({
                'success': True,
                'count': len(incidents_store),
                'results': incidents_store,
                'timestamp': datetime.now().isoformat()
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Validate required fields
            required_fields = ['title', 'description', 'severity', 'type']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }, status=400)

            # Create new incident
            new_incident = {
                'id': data.get('id', f'incident-{datetime.now().timestamp()}'),
                'title': data['title'],
                'description': data['description'],
                'severity': min(max(int(data['severity']), 1), 5),
                'type': data['type'],
                'timestamp': data.get('timestamp', datetime.now().isoformat()),
                'lat': float(data.get('lat', 37.7749)),
                'lng': float(data.get('lng', -122.4194)),
                'location': data.get('location', 'Unknown location'),
                'status': data.get('status', 'active'),
            }

            # Add to store
            incidents_store.insert(0, new_incident)

            return JsonResponse({
                'success': True,
                'message': 'Incident created successfully',
                'incident': new_incident
            }, status=201)

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
