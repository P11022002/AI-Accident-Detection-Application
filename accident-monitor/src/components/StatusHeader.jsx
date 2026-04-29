import { RotateCcw, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { useAccidentStore } from '../store/AccidentStore'
import { useEffect, useState } from 'react'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function StatusHeader() {
  const { accidents, loading, error, selectedAccident, refresh } = useAccidentStore()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const incidentCount = accidents.length
  const systemStatus = !isOnline ? 'offline' : error ? 'degraded' : 'operational'
  const statusLabel = systemStatus === 'offline' ? 'Offline' : systemStatus === 'degraded' ? 'Degraded' : 'Operational'
  const statusTone = systemStatus === 'offline' ? 'status-offline' : systemStatus === 'degraded' ? 'status-warning' : 'status-ok'
  const recentUpdate = selectedAccident ? formatTime(selectedAccident.timestamp) : '--'
  const liveText = loading ? 'Realtime stream refreshing' : 'Realtime alert stream active'
  const connectionText = isOnline ? 'Backend connected' : 'Backend disconnected'

  return (
    <section className="status-bar">
      <div className="status-card headline-card">
        <div className="status-card-title">🚨 AI Accident Monitoring</div>
        <div className="status-card-copy">
          Live situational awareness for every critical roadway incident with real-time geolocation tracking.
        </div>
        <div className="live-alert-badge">
          <span className={`live-dot ${loading ? 'live-pulse' : 'live-on'}`} />
          <span>{liveText}</span>
        </div>
      </div>

      <div className="status-stack">
        <div className="status-card">
          <div className="status-card-title">System Health</div>
          <div className={`status-pill ${statusTone}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {statusLabel}
          </div>
          <div className="status-copy">{connectionText}. {isOnline && <>Feed is {statusLabel.toLowerCase()}.</>}</div>
        </div>

        <div className="status-card compact-card">
          <div className="status-card-title">Active Alerts</div>
          <div className="metric-value">{loading ? '—' : incidentCount}</div>
          <div className="status-copy">incidents detected today</div>
        </div>

        <div className="status-card compact-card">
          <div className="status-card-title">Latest Incident</div>
          <div className="metric-value" title={selectedAccident?.title}>{selectedAccident?.type ?? '--'}</div>
          <div className="status-copy">at {recentUpdate}</div>
        </div>

        <div className="status-card compact-card">
          <div className="status-card-title">Location</div>
          <div className="metric-value metric-address">{selectedAccident?.location?.split(',')[0] ?? '--'}</div>
          <div className="status-copy">current incident area</div>
        </div>

        <button className="refresh-button" type="button" onClick={refresh} disabled={loading || !isOnline} title="Refresh incidents from backend">
          <RotateCcw size={18} />
          {loading ? 'Refreshing...' : 'Refresh feed'}
        </button>
      </div>
    </section>
  )
}
