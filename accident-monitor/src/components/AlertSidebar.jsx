import { AlertTriangle, RefreshCw, Filter, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useAccidentStore } from '../store/AccidentStore'
import IncidentCard from './IncidentCard'
import CameraFeed from './CameraFeed'

export default function AlertSidebar() {
  const { accidents, loading, error, selectedId, setSelectedId, refresh } = useAccidentStore()
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [sortBy, setSortBy] = useState('severity')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter and sort incidents
  const filteredAndSorted = useMemo(() => {
    let filtered = accidents

    // Apply severity filter
    if (filterSeverity !== 'all') {
      const level = parseInt(filterSeverity)
      filtered = filtered.filter((incident) => incident.severity === level)
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          return b.severity - a.severity // Highest severity first
        case 'recent':
          return new Date(b.timestamp) - new Date(a.timestamp) // Most recent first
        case 'type':
          return a.type.localeCompare(b.type) // Alphabetically by type
        default:
          return 0
      }
    })

    return sorted
  }, [accidents, filterSeverity, sortBy])

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: accidents.length,
      critical: accidents.filter((a) => a.severity >= 4).length,
      high: accidents.filter((a) => a.severity === 3).length,
      moderate: accidents.filter((a) => a.severity === 2).length,
      low: accidents.filter((a) => a.severity === 1).length,
    }
  }, [accidents])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleClearFilters = () => {
    setFilterSeverity('all')
    setSortBy('severity')
  }

  const isFiltered = filterSeverity !== 'all' || sortBy !== 'severity'

  return (
    <aside className="sidebar-panel">
      {/* Camera Feed Section */}
      <CameraFeed />

      {/* Header with Controls */}
      <div className="sidebar-header">
        <div>
          <p className="sidebar-label">Real-time Alerts</p>
          <h2>Incident watch list</h2>
        </div>
        <div className="alert-chip">
          <AlertTriangle size={18} /> {stats.total} alerts
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="sidebar-alert error-alert">
          <AlertTriangle size={16} />
          <div>
            <p className="error-title">Unable to fetch alerts</p>
            <p className="error-message">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Bar */}
      {accidents.length > 0 && (
        <div className="incident-stats">
          <div className={`stat ${filterSeverity === '5' ? 'active' : ''}`} onClick={() => setFilterSeverity('5')}>
            <span className="stat-value" style={{ color: '#ff4f70' }}>
              {stats.critical}
            </span>
            <span className="stat-label">Critical</span>
          </div>
          <div className={`stat ${filterSeverity === '4' ? 'active' : ''}`} onClick={() => setFilterSeverity('4')}>
            <span className="stat-value" style={{ color: '#ff8c52' }}>
              {stats.high}
            </span>
            <span className="stat-label">High</span>
          </div>
          <div className={`stat ${filterSeverity === '3' ? 'active' : ''}`} onClick={() => setFilterSeverity('3')}>
            <span className="stat-value" style={{ color: '#f0b429' }}>
              {stats.moderate}
            </span>
            <span className="stat-label">Moderate</span>
          </div>
          <div className={`stat ${filterSeverity === '2' ? 'active' : ''}`} onClick={() => setFilterSeverity('2')}>
            <span className="stat-value" style={{ color: '#5fc3ff' }}>
              {stats.low}
            </span>
            <span className="stat-label">Low</span>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="sidebar-controls">
        <div className="control-group">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="control-select">
            <option value="severity">Sort by Severity</option>
            <option value="recent">Sort by Recent</option>
            <option value="type">Sort by Type</option>
          </select>

          <button
            className="control-button refresh-btn"
            type="button"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            title="Refresh incidents"
          >
            <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
          </button>
        </div>

        {isFiltered && (
          <button className="control-button clear-btn" type="button" onClick={handleClearFilters} title="Clear filters">
            <X size={16} /> Clear filters
          </button>
        )}
      </div>

      {/* Incidents List */}
      <div className="incident-list">
        {loading && (
          <div className="sidebar-empty">
            <div className="spinner" />
            <p>Loading latest alerts...</p>
          </div>
        )}

        {!loading && filteredAndSorted.length === 0 && (
          <div className="sidebar-empty">
            {accidents.length === 0 ? (
              <>
                <AlertTriangle size={32} opacity={0.5} />
                <p>No active incidents found.</p>
                <p className="empty-hint">All systems normal</p>
              </>
            ) : (
              <>
                <Filter size={32} opacity={0.5} />
                <p>No incidents match current filters.</p>
                <button className="clear-btn" onClick={handleClearFilters}>
                  Clear filters
                </button>
              </>
            )}
          </div>
        )}

        {!loading &&
          filteredAndSorted.map((incident, index) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              isSelected={selectedId === incident.id}
              onClick={setSelectedId}
              index={index}
            />
          ))}
      </div>

      {/* Footer with Last Updated */}
      {accidents.length > 0 && (
        <div className="sidebar-footer">
          <p className="last-updated">
            Last incident: {new Date(filteredAndSorted[0]?.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </aside>
  )
}
