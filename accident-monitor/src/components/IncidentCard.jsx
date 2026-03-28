import { Clock3, MapPin, AlertTriangle, Truck } from 'lucide-react'

const severityLabels = {
  1: { label: 'Low', color: 'severity-low' },
  2: { label: 'Moderate', color: 'severity-medium' },
  3: { label: 'High', color: 'severity-high' },
  4: { label: 'Critical', color: 'severity-critical' },
  5: { label: 'Severe', color: 'severity-extreme' },
}

export default function IncidentCard({ incident, isSelected, onClick }) {
  const severity = severityLabels[Math.min(Math.max(incident.severity, 1), 5)]

  return (
    <article className={`incident-card ${isSelected ? 'selected' : ''}`} onClick={() => onClick(incident.id)}>
      <div className="incident-card-top">
        <div>
          <div className="incident-title">{incident.title}</div>
          <div className="incident-meta">
            <span className={`incident-pill ${severity.color}`}>{severity.label}</span>
            <span className="incident-type">{incident.type}</span>
          </div>
        </div>
        <div className="incident-icon">
          <Truck size={20} />
        </div>
      </div>

      <p className="incident-description">{incident.description}</p>

      <div className="incident-footer">
        <span>
          <MapPin size={14} /> {incident.location}
        </span>
        <span>
          <Clock3 size={14} /> {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </article>
  )
}
