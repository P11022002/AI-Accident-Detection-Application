import { Clock3, MapPin, AlertTriangle, Truck, AlertCircle, Navigation2, Activity } from 'lucide-react'

const severityLabels = {
  1: { label: 'Low', color: 'severity-low' },
  2: { label: 'Moderate', color: 'severity-medium' },
  3: { label: 'High', color: 'severity-high' },
  4: { label: 'Critical', color: 'severity-critical' },
  5: { label: 'Severe', color: 'severity-extreme' },
}

const incidentIcons = {
  Collision: AlertTriangle,
  Rollover: Truck,
  Motorcycle: AlertCircle,
  Stall: MapPin,
  Accident: AlertTriangle,
  'Object Collision': AlertTriangle,
}

const statusBadges = {
  active: { label: 'Active', color: 'status-active' },
  resolved: { label: 'Resolved', color: 'status-resolved' },
  investigating: { label: 'Under Investigation', color: 'status-investigating' },
}

function getIncidentStatus(severity) {
  // Default to Active for high severity incidents
  if (severity >= 4) return statusBadges.active
  return statusBadges.active
}

export default function IncidentCard({ incident, isSelected, onClick }) {
  if (!incident) return null

  const severity = severityLabels[Math.min(Math.max(incident.severity, 1), 5)]
  const status = getIncidentStatus(incident.severity)
  const IconComponent = incidentIcons[incident.type] || AlertTriangle
  const incidentTime = new Date(incident.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  const collisionObjects = Array.isArray(incident.objects) ? incident.objects.join(' + ') : ''
  const collisionTime = incident.collision_time ? new Date(incident.collision_time).toLocaleString() : null

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(incident.id)
    }
  }

  return (
    <article
      className={`incident-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(incident.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${incident.type}: ${incident.title}`}
    >
      <div className="incident-card-top">
        <div>
          <div className="incident-title">{incident.title}</div>
          <div className="incident-meta">
            <span className={`incident-pill ${severity.color}`}>{severity.label}</span>
            <span className="incident-type">{incident.type}</span>
            <span className={`incident-status ${status.color}`}>
              <Activity size={12} /> {status.label}
            </span>
            {incident.id && <span className="incident-id">#{incident.id}</span>}
          </div>
        </div>
        <div className="incident-icon">
          <IconComponent size={20} />
        </div>
      </div>

      <p className="incident-description">{incident.description}</p>

      <div className="incident-coords">
        <span>
          <Navigation2 size={12} /> {incident.lat?.toFixed(4)}, {incident.lng?.toFixed(4)}
        </span>
      </div>

      {(collisionObjects || incident.collision_area || collisionTime) && (
        <div className="incident-coords">
          {collisionObjects && <span>Objects: {collisionObjects}</span>}
          {incident.collision_area && <span>Collision: {incident.collision_area}</span>}
          {collisionTime && <span>Date and time: {collisionTime}</span>}
        </div>
      )}

      <div className="incident-footer">
        <span>
          <MapPin size={14} /> {incident.location || 'Unknown location'}
        </span>
        <span>
          <Clock3 size={14} /> {incidentTime}
        </span>
      </div>
    </article>
  )
}
