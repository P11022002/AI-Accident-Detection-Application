import { AlertTriangle } from 'lucide-react'
import { useAccidentStore } from '../store/AccidentStore'
import IncidentCard from './IncidentCard'
import CameraFeed from './CameraFeed'

export default function AlertSidebar() {
  const { accidents, loading, error, selectedId, setSelectedId } = useAccidentStore()

  return (
    <aside className="sidebar-panel">
      <div className="sidebar-header">
        <div>
          <p className="sidebar-label">Real-time Alerts</p>
          <h2>Incident watch list</h2>
        </div>
        <div className="alert-chip">
          <AlertTriangle size={18} /> Live feed
        </div>
      </div>

      {error && <div className="sidebar-alert">{error}</div>}

      <CameraFeed />

      <div className="incident-list">
        {loading && <div className="sidebar-empty">Loading latest alerts...</div>}
        {!loading && accidents.length === 0 && <div className="sidebar-empty">No active incidents found.</div>}
        {accidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            isSelected={selectedId === incident.id}
            onClick={setSelectedId}
          />
        ))}
      </div>
    </aside>
  )
}
