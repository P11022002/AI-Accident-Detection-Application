from django.http import JsonResponse


def accidents_view(request):
    sample_accidents = [
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
        },
    ]

    return JsonResponse(sample_accidents, safe=False)
