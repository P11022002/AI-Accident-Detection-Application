import { RotateCcw, ShieldCheck } from 'lucide-react'
import { useAccidentStore } from '../store/AccidentStore'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function StatusHeader() {
  const { accidents, loading, error, selectedAccident, refresh } = useAccidentStore()
  const incidentCount = accidents.length
  const statusLabel = error ? 'Degraded' : 'Operational'
  const statusTone = error ? 'status-warning' : 'status-ok'
  const recentUpdate = selectedAccident ? formatTime(selectedAccident.timestamp) : '--'
  const liveText = loading ? 'Realtime stream refreshing' : 'Realtime alert stream active'

  return (
    <section className="status-bar">
      <div className="status-card headline-card">
        <div className="status-card-title">AI Accident Monitoring</div>
        <div className="status-card-copy">
          Live situational awareness for every critical roadway incident.
        </div>
        <div className="live-alert-badge">
          <span className={`live-dot ${loading ? 'live-pulse' : 'live-on'}`} />
          <span>{liveText}</span>
        </div>
      </div>

      <div className="status-stack">
        <div className="status-card">
          <div className="status-card-title">System health</div>
          <div className={`status-pill ${statusTone}`}>
            <ShieldCheck size={16} />
            {statusLabel}
          </div>
          <div className="status-copy">Feed connection is {loading ? 'refreshing' : statusLabel.toLowerCase()}.</div>
        </div>

        <div className="status-card compact-card">
          <div className="status-card-title">Active alerts</div>
          <div className="metric-value">{loading ? '—' : incidentCount}</div>
          <div className="status-copy">Current alerts across the network.</div>
        </div>

        <div className="status-card compact-card">
          <div className="status-card-title">Latest incident</div>
          <div className="metric-value">{selectedAccident?.type ?? '--'}</div>
          <div className="status-copy">Updated at {recentUpdate}.</div>
        </div>

        <button className="refresh-button" type="button" onClick={refresh} disabled={loading}>
          <RotateCcw size={18} />
          {loading ? 'Refreshing...' : 'Refresh feed'}
        </button>
      </div>
    </section>
  )
}
