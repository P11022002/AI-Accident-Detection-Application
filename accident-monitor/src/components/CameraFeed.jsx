import { useEffect, useRef, useState, useCallback } from 'react'
import { useAccidentStore } from '../store/AccidentStore'
import api from '../services/api'
import '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const DETECTION_CLASSES = new Set(['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'fire hydrant', 'dogs', 'cats'])
const ACCIDENT_THRESHOLD = 0.35 // Lowered threshold for better detection

export default function CameraFeed() {
  const { accidents, addAccident } = useAccidentStore()
  const [stream, setStream] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [detections, setDetections] = useState([])
  const [fps, setFps] = useState(0)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationName, setLocationName] = useState('Detecting location...')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const modelRef = useRef(null)
  const detectionTimerRef = useRef(null)
  const lastAccidentTimeRef = useRef({})
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(0)

  // Get current location on mount
  useEffect(() => {
    lastFpsTimeRef.current = Date.now()
  }, [])

  const fetchAddressFromCoordinates = async (lat, lng) => {
    try {
      // Using OpenStreetMap Nominatim API for free reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'accident-monitor' } },
      )
      const data = await response.json()
      const address = data.address?.road || data.address?.city || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      setLocationName(address)
    } catch (err) {
      console.error('Geocoding error:', err)
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    }
  }

  const calculateDistance = (bbox1, bbox2) => {
    const [x1, y1, w1, h1] = bbox1
    const [x2, y2, w2, h2] = bbox2
    const cx1 = x1 + w1 / 2
    const cy1 = y1 + h1 / 2
    const cx2 = x2 + w2 / 2
    const cy2 = y2 + h2 / 2
    return Math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2)
  }

  const reportAccident = useCallback(async (type, description, severity) => {
    const newAccident = {
      id: `incident-${Date.now()}`,
      title: type,
      description,
      severity,
      type,
      timestamp: new Date().toISOString(),
      lat: currentLocation?.lat || 37.7749,
      lng: currentLocation?.lng || -122.4194,
      location: locationName,
    }

    // Only add if not already in store
    if (!accidents.some((a) => a.id === newAccident.id)) {
      // Send to backend API
      try {
        const response = await api.post('/accidents/', newAccident)
        if (response.data.success) {
          // Add to local store only if backend accepted it
          if (addAccident) {
            addAccident(newAccident)
          }
          console.log('Incident reported to backend:', newAccident.id)
        }
      } catch (err) {
        console.error('Failed to report incident to backend:', err)
        // Still add to local store as fallback
        if (addAccident) {
          addAccident(newAccident)
        }
      }
    }
  }, [accidents, addAccident, currentLocation, locationName])

  // Function to detect accident patterns from multiple detections
  const analyzeForAccidents = useCallback((predictions) => {
    const vehicles = predictions.filter((p) => ['car', 'truck', 'bus', 'motorcycle'].includes(p.class))

    if (vehicles.length >= 2) {
      // Check for potential collisions (vehicles close to each other)
      for (let i = 0; i < vehicles.length; i++) {
        for (let j = i + 1; j < vehicles.length; j++) {
          const dist = calculateDistance(vehicles[i].bbox, vehicles[j].bbox)
          if (dist < 120) {
            // Vehicles are close - potential accident
            const now = Date.now()
            const accidentKey = `collision-${Math.floor(now / 10000)}`
            if (!lastAccidentTimeRef.current[accidentKey]) {
              lastAccidentTimeRef.current[accidentKey] = true
              reportAccident(
                'Collision',
                `Potential collision detected between ${vehicles[i].class} and ${vehicles[j].class} near ${locationName}`,
                4,
              )
            }
          }
        }
      }
    }

    // Detect anomalies - person near vehicles
    const people = predictions.filter((p) => p.class === 'person')
    if (people.length > 0 && vehicles.length > 0) {
      people.forEach((person) => {
        vehicles.forEach((vehicle) => {
          const dist = calculateDistance(person.bbox, vehicle.bbox)
          if (dist < 100) {
            const now = Date.now()
            const accidentKey = `pedestrian-${Math.floor(now / 10000)}`
            if (!lastAccidentTimeRef.current[accidentKey]) {
              lastAccidentTimeRef.current[accidentKey] = true
              reportAccident('Pedestrian Incident', `Pedestrian detected near vehicle at ${locationName}`, 5)
            }
          }
        })
      })
    }
  }, [locationName, reportAccident])

  useEffect(() => {
    if (!navigator?.geolocation) {
      setLocationName('Location unavailable')
      return
    }

    const geoWatcher = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCurrentLocation({ lat: latitude, lng: longitude })
        // Reverse geocode to get address
        fetchAddressFromCoordinates(latitude, longitude) // eslint-disable-line react-hooks/exhaustive-deps
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationName('Location permission denied')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    )

    return () => navigator.geolocation.clearWatch(geoWatcher)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const drawDetections = (predictions) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !predictions) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw info
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px Arial'
    ctx.fillText(`FPS: ${fps}`, 10, 25)
    ctx.fillText(`Objects: ${predictions.length}`, 10, 45)
    ctx.fillText(`Location: ${locationName}`, 10, 65)

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox
      const isVehicle = ['car', 'truck', 'bus', 'motorcycle'].includes(prediction.class)
      const isPerson = prediction.class === 'person'
      const color = isPerson ? 'rgba(255, 200, 0, 0.95)' : isVehicle ? 'rgba(255, 100, 100, 0.95)' : 'rgba(95, 195, 255, 0.95)'
      const label = `${prediction.class} ${(prediction.score * 100).toFixed(0)}%`

      // Draw bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)

      // Draw label background
      ctx.fillStyle = 'rgba(2, 10, 25, 0.95)'
      const textMetrics = ctx.measureText(label)
      ctx.fillRect(x, y - 28, textMetrics.width + 12, 24)

      // Draw label text
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px Arial'
      ctx.fillText(label, x + 6, y - 10)
    })
  }

  const stopDetections = () => {
    if (detectionTimerRef.current) {
      window.clearTimeout(detectionTimerRef.current)
      detectionTimerRef.current = null
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    setDetections([])
  }

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.muted = true
    }
  }, [stream])

  useEffect(() => {
    return () => {
      stopDetections()
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const startDetectionLoop = async () => {
    if (!videoRef.current || !modelRef.current) return

    const detect = async () => {
      if (!videoRef.current || !modelRef.current) return
      if (videoRef.current.readyState < 3) {
        detectionTimerRef.current = window.setTimeout(detect, 100)
        return
      }

      try {
        const predictions = await modelRef.current.detect(videoRef.current)
        const filtered = predictions.filter(
          (prediction) => prediction.score >= ACCIDENT_THRESHOLD && DETECTION_CLASSES.has(prediction.class),
        )

        setDetections(filtered)
        drawDetections(filtered)

        // Analyze for accident patterns
        if (filtered.length > 0) {
          analyzeForAccidents(filtered)
        }

        // Calculate FPS
        frameCountRef.current++
        const now = Date.now()
        if (now - lastFpsTimeRef.current >= 1000) {
          setFps(frameCountRef.current)
          frameCountRef.current = 0
          lastFpsTimeRef.current = now
        }
      } catch (err) {
        console.error('Detection error:', err)
      }

      detectionTimerRef.current = window.setTimeout(detect, 200)
    }

    detect()
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported by this browser.')
      setStatus('error')
      return
    }

    setStatus('starting')
    setError('')

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      setStream(mediaStream)
      setStatus('loading-model')

      if (!modelRef.current) {
        try {
          console.log('Loading COCO-SSD model...')
          const loadedModel = await cocoSsd.load()
          modelRef.current = loadedModel
          setStatus('detecting')
          await startDetectionLoop()
        } catch (modelErr) {
          setError('Failed to load detection model. ' + modelErr?.message)
          setStatus('error')
          mediaStream.getTracks().forEach((track) => track.stop())
        }
      } else {
        setStatus('detecting')
        await startDetectionLoop()
      }
    } catch (err) {
      setError(err?.message || 'Unable to access the camera.')
      setStatus('error')
      console.error('Camera error:', err)
    }
  }

  const stopCamera = () => {
    if (!stream) return
    stopDetections()
    stream.getTracks().forEach((track) => track.stop())
    setStream(null)
    setStatus('idle')
  }

  const statusText = {
    idle: 'Camera ready to start.',
    starting: 'Requesting camera permission...',
    'loading-model': 'Loading detection engine...',
    detecting: detections.length > 0 ? `${detections.length} object${detections.length === 1 ? '' : 's'} detected live` : 'Analyzing camera feed...',
    live: 'Live camera feed active.',
    error: error || 'Camera feed error.',
  }

  return (
    <section className="camera-card">
      <div className="camera-header">
        <div>
          <p className="camera-label">Real-time Detection</p>
          <h3>Live Object Detection with Geolocation</h3>
        </div>
        <div className={`camera-status ${status}`}>{statusText[status]}</div>
      </div>

      <div className="location-display">
        <span><strong>📍 Current Location:</strong> {locationName}</span>
      </div>

      <div className="camera-preview">
        <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="camera-overlay" />
        {!stream && <div className="camera-placeholder">Click "Start camera" to begin real-time detection</div>}
      </div>

      <div className="camera-actions">
        <button
          className="camera-button start"
          type="button"
          onClick={startCamera}
          disabled={status === 'starting' || status === 'loading-model' || status === 'detecting'}
        >
          Start camera
        </button>
        <button className="camera-button stop" type="button" onClick={stopCamera} disabled={!stream}>
          Stop camera
        </button>
      </div>

      {detections.length > 0 && (
        <div className="detection-summary">
          <h4>🔍 Detected Objects:</h4>
          <ul>
            {detections.map((det, idx) => (
              <li key={idx}>
                {det.class} - {(det.score * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
