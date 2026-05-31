import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet'
import { RefreshCw } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { useAccidentStore } from '../store/AccidentContext'

function AutoBounds({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return
    const bounds = points.map((point) => [point.lat, point.lng])
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
  }, [map, points])

  return null
}

function incidentColor(severity) {
  if (severity >= 5) return '#ff4f70'
  if (severity >= 4) return '#ff8c52'
  if (severity >= 3) return '#f0b429'
  return '#5fc3ff'
}

const legendItems = [
  { label: 'Severe', color: '#ff4f70' },
  { label: 'Critical', color: '#ff8c52' },
  { label: 'High', color: '#f0b429' },
  { label: 'Low', color: '#5fc3ff' },
]

function isWithinIndia(lat, lng) {
  return lat >= 6.5 && lat <= 37.1 && lng >= 68.0 && lng <= 97.5
}

export default function MapView() {
  const { accidents, selectedId, setSelectedId, refresh, loading } = useAccidentStore()
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [currentAddress, setCurrentAddress] = useState(null)
  const defaultCenter = useMemo(() => [20.5937, 78.9629], [])
  const points = accidents.filter((incident) => incident.lat && incident.lng)

  useEffect(() => {
    if (!navigator?.geolocation) {
      setLocationError('Browser location unavailable')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        if (!isWithinIndia(latitude, longitude)) {
          setCurrentLocation(null)
          setLocationError('Current location is outside India')
          return
        }
        setCurrentLocation({ lat: latitude, lng: longitude, accuracy })
      },
      (error) => {
        setLocationError(error.message || 'Location permission denied')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    if (!currentLocation) {
      return
    }

    const controller = new AbortController()
    const { lat, lng } = currentLocation

    async function fetchAddress() {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&countrycodes=in&lat=${lat}&lon=${lng}`,
          {
            headers: {
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error('Unable to resolve address')
        }

        const data = await response.json()
        setCurrentAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCurrentAddress(null)
        }
      }
    }

    fetchAddress()

    return () => {
      controller.abort()
    }
  }, [currentLocation])

  const allPoints = useMemo(() => {
    if (!currentLocation) return points
    return [...points, currentLocation]
  }, [points, currentLocation])

  function CenterOnLocation({ location }) {
    const map = useMap()

    if (!location) return null

    return (
      <button
        type="button"
        className="center-location-button"
        onClick={() => map.flyTo([location.lat, location.lng], 14, { duration: 0.8 })}
      >
        Center on my location
      </button>
    )
  }

  return (
    <div className="map-shell">
      <div className="map-toolbar">
        <div className="location-info">
          <span className="location-label">Current address</span>
          <p className="location-text">
            {currentAddress || locationError || (currentLocation
              ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
              : 'Detecting current location...')}
          </p>
        </div>

        <button type="button" className="refresh-button map-refresh" onClick={refresh} disabled={loading} title="Refresh incident feed">
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div className="map-legend">
        <span className="legend-title">Severity legend</span>
        <div className="legend-items">
          {legendItems.map((item) => (
            <span key={item.label} className="legend-chip">
              <span className="legend-swatch" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="current-location-card">
        <div className="location-label">Coordinates</div>
        <div className="location-value">
          {currentLocation
            ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
            : locationError || 'Detecting current location...'}
        </div>
        {currentLocation?.accuracy && (
          <div className="location-note">Accuracy ~{Math.round(currentLocation.accuracy)} m</div>
        )}
      </div>
      <MapContainer center={currentLocation ? [currentLocation.lat, currentLocation.lng] : defaultCenter} zoom={12} scrollWheelZoom={true} className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoBounds points={allPoints} />
        <CenterOnLocation location={currentLocation} />
        {currentLocation && (
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            pathOptions={{ color: '#6ee7b7', fillColor: '#6ee7b7', fillOpacity: 0.28, weight: 2 }}
            radius={12}
          >
            <Tooltip direction="bottom" offset={[0, 10]} opacity={1} permanent>
              Your current location
            </Tooltip>
          </CircleMarker>
        )}
        {points.map((incident) => (
          <CircleMarker
            key={incident.id}
            center={[incident.lat, incident.lng]}
            pathOptions={{ color: incidentColor(incident.severity), fillColor: incidentColor(incident.severity), fillOpacity: 0.8, weight: incident.id === selectedId ? 4 : 2 }}
            radius={incident.id === selectedId ? 14 : 10}
            eventHandlers={{ click: () => setSelectedId(incident.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
              {incident.title}
            </Tooltip>
            <Popup>
              <div className="popup-card">
                <strong>{incident.title}</strong>
                <p>{incident.description}</p>
                <p className="popup-meta">
                  <span>{incident.type}</span>
                  <span>{new Date(incident.timestamp).toLocaleString()}</span>
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
