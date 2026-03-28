import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAccidentStore } from '../store/AccidentStore'

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

export default function MapView() {
  const { accidents, selectedId, setSelectedId } = useAccidentStore()
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const defaultCenter = useMemo(() => [37.7749, -122.4194], [])
  const points = accidents.filter((incident) => incident.lat && incident.lng)

  useEffect(() => {
    if (!navigator?.geolocation) {
      setLocationError('Browser location unavailable')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setCurrentLocation({ lat: latitude, lng: longitude, accuracy })
      },
      (error) => {
        setLocationError(error.message || 'Location permission denied')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

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
        <div className="location-label">Your current location</div>
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
