import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const fallbackAccidents = [
  {
    id: 'A-001',
    title: 'Multi-vehicle collision',
    description: 'Heavy traffic collision with possible injuries on the southbound highway.',
    severity: 4,
    type: 'Collision',
    timestamp: '2026-03-27T08:45:00Z',
    lat: 37.7836,
    lng: -122.4089,
    location: 'Market St, San Francisco, CA',
  },
  {
    id: 'A-002',
    title: 'Truck rollover',
    description: 'Commercial truck overturned near the river bridge. Expect delays.',
    severity: 5,
    type: 'Rollover',
    timestamp: '2026-03-27T08:10:00Z',
    lat: 37.7597,
    lng: -122.4280,
    location: 'Hayes Valley, San Francisco, CA',
  },
  {
    id: 'A-003',
    title: 'Motorcycle impact',
    description: 'Single motorcycle incident with emergency response dispatched.',
    severity: 3,
    type: 'Motorcycle',
    timestamp: '2026-03-27T07:34:00Z',
    lat: 37.7924,
    lng: -122.4010,
    location: 'Embarcadero, San Francisco, CA',
  },
  {
    id: 'A-004',
    title: 'Disabled vehicle',
    description: 'Broken down car blocking the right lane, slow moving traffic.',
    severity: 2,
    type: 'Stall',
    timestamp: '2026-03-27T07:05:00Z',
    lat: 37.7685,
    lng: -122.4324,
    location: 'Van Ness Ave, San Francisco, CA',
  },
]

function formatAccidents(payload) {
  if (!Array.isArray(payload)) {
    return fallbackAccidents
  }
  return payload.map((item, index) => ({
    id: item.id || item.uuid || `incident-${index}`,
    title: item.title || item.summary || item.description || 'Unknown incident',
    description: item.description || item.details || 'No description available.',
    severity: Number(item.severity ?? item.urgency ?? 3),
    type: item.type || item.category || 'Accident',
    timestamp: item.timestamp || item.occurred_at || new Date().toISOString(),
    lat: Number(item.latitude ?? item.lat ?? item.location?.lat ?? 37.7749),
    lng: Number(item.longitude ?? item.lng ?? item.location?.lng ?? -122.4194),
    location: item.location || item.location_name || 'Unknown location',
  }))
}

export default function useAccidents() {
  const [accidents, setAccidents] = useState(fallbackAccidents)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(fallbackAccidents[0]?.id ?? null)

  async function fetchAccidents() {
    setLoading(true)
    setError(null)

    try {
      const response = await api.get('/accidents/')
      const payload = response.data?.results ?? response.data
      const normalized = formatAccidents(payload)
      setAccidents(normalized)
      setSelectedId((current) => current || normalized[0]?.id)
    } catch (err) {
      setError('Unable to fetch live alerts. Showing fallback incident feed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccidents()
  }, [])

  const selectedAccident = useMemo(
    () => accidents.find((accident) => accident.id === selectedId) || accidents[0] || null,
    [accidents, selectedId],
  )

  return {
    accidents,
    loading,
    error,
    selectedId,
    setSelectedId,
    selectedAccident,
    refresh: fetchAccidents,
  }
}
