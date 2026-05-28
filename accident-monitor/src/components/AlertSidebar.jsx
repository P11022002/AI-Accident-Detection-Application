import { AlertTriangle } from 'lucide-react'
import { useAccidentStore } from '../store/AccidentContext'
import CameraFeed from './CameraFeed'

export default function AlertSidebar() {
  const { accidents, loading, error } = useAccidentStore()

  return (
    <aside className="sidebar-panel">
      <CameraFeed />

      <div className="sidebar-header">
        <div>
          <p className="sidebar-label">Real-time Alerts</p>
          <h2>Incident watch</h2>
        </div>
        <div className="alert-chip">
          <AlertTriangle size={18} /> {accidents.length} alerts
        </div>
      </div>

      {error && (
        <div className="sidebar-alert error-alert">
          <AlertTriangle size={16} />
          <div>
            <p className="error-title">Unable to fetch alerts</p>
            <p className="error-message">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="sidebar-empty">
          <div className="spinner" />
          <p>Loading latest alerts...</p>
        </div>
      )}

      {!loading && accidents.length === 0 && (
        <div className="sidebar-empty">
          <AlertTriangle size={32} opacity={0.5} />
          <p>No active incidents found.</p>
          <p className="empty-hint">All systems normal</p>
        </div>
      )}

      {!loading && accidents.length > 0 && (
        <div className="sidebar-summary">
          <div className="summary-card">
            <span className="summary-label">Active incidents</span>
            <strong>{accidents.length}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Latest incident</span>
            <strong>{new Date(accidents[0].timestamp).toLocaleTimeString()}</strong>
          </div>
        </div>
      )}

      {!loading && (
        <div className="sidebar-footer">
          <p className="last-updated">Last refreshed: {new Date().toLocaleTimeString()}</p>
        </div>
      )}
    </aside>
  )
}
