from django.db import models


class AccidentIncident(models.Model):
    incident_id = models.CharField(max_length=80, unique=True)
    title = models.CharField(max_length=160)
    description = models.TextField()
    severity = models.PositiveSmallIntegerField(default=3)
    incident_type = models.CharField(max_length=80)
    occurred_at = models.DateTimeField()
    lat = models.FloatField(default=37.7749)
    lng = models.FloatField(default=-122.4194)
    location = models.CharField(max_length=255, default='Unknown location')
    status = models.CharField(max_length=40, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-occurred_at', '-created_at']

    def __str__(self):
        return f'{self.incident_id}: {self.title}'

    def to_dict(self):
        return {
            'id': self.incident_id,
            'title': self.title,
            'description': self.description,
            'severity': self.severity,
            'type': self.incident_type,
            'timestamp': self.occurred_at.isoformat(),
            'lat': self.lat,
            'lng': self.lng,
            'location': self.location,
            'status': self.status,
        }
