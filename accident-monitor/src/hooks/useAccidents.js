import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const fallbackAccidents = []

function isWithinIndia(lat, lng) {
  return lat >= 6.5 && lat <= 37.1 && lng >= 68.0 && lng <= 97.5
}

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
    lat: Number(item.latitude ?? item.lat ?? item.location?.lat),
    lng: Number(item.longitude ?? item.lng ?? item.location?.lng),
    location: item.location || item.location_name || 'Unknown location',
    source: item.source || 'camera',
    objects: item.objects || [],
    collision_time: item.collision_time,
    collision_point: item.collision_point,
    collision_area: item.collision_area,
  })).filter((item) => item.source === 'camera' && isWithinIndia(item.lat, item.lng))
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
      console.error('Failed to fetch accidents:', err)
      setAccidents([])
      setSelectedId(null)
      const apiUrl = err.config?.baseURL || 'backend API'
      if (err.code === 'ERR_NETWORK') {
        setError(`Unable to reach Django at ${apiUrl}. Start the backend server and refresh the feed.`)
      } else {
        setError(err.response?.data?.error || 'Unable to fetch camera alerts.')
      }
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

  const addAccident = (newAccident) => {
    setAccidents((prevAccidents) => {
      // Check if accident already exists to avoid duplicates
      const exists = prevAccidents.some((a) => a.id === newAccident.id)
      if (exists) return prevAccidents

      // Add new accident to the beginning of the list
      const updated = [newAccident, ...prevAccidents]
      // Automatically select the newly detected accident
      setSelectedId(newAccident.id)
      return updated
    })
  }

  return {
    accidents,
    loading,
    error,
    selectedId,
    setSelectedId,
    selectedAccident,
    refresh: fetchAccidents,
    addAccident,
  }
}
