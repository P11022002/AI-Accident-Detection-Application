import { useEffect, useRef, useState, useCallback } from 'react'
import { useAccidentStore } from '../store/AccidentContext'
import api from '../services/api'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const DETECTION_CLASSES = new Set([
  'person',
  'car',
  'truck',
  'bus',
  'motorcycle',
  'bicycle',
  'bottle',
  'pen',
  'copy',
])
const ACCIDENT_THRESHOLD = 0.35 // Lowered threshold for better detection
const COLLISION_COOLDOWN_MS = 12000
const COLLISION_DISTANCE_PX = 110
const COLLISION_IOU_THRESHOLD = 0.08
const INDIA_BOUNDS = {
  minLat: 6.5,
  maxLat: 37.1,
  minLng: 68.0,
  maxLng: 97.5,
}

function isWithinIndia(lat, lng) {
  return lat >= INDIA_BOUNDS.minLat && lat <= INDIA_BOUNDS.maxLat && lng >= INDIA_BOUNDS.minLng && lng <= INDIA_BOUNDS.maxLng
}

function getBoxCenter(bbox) {
  const [x, y, width, height] = bbox
  return {
    x: x + width / 2,
    y: y + height / 2,
  }
}

function calculateDistance(bbox1, bbox2) {
  const center1 = getBoxCenter(bbox1)
  const center2 = getBoxCenter(bbox2)
  return Math.sqrt((center1.x - center2.x) ** 2 + (center1.y - center2.y) ** 2)
}

function calculateOverlap(bbox1, bbox2) {
  const [x1, y1, w1, h1] = bbox1
  const [x2, y2, w2, h2] = bbox2
  const left = Math.max(x1, x2)
  const top = Math.max(y1, y2)
  const right = Math.min(x1 + w1, x2 + w2)
  const bottom = Math.min(y1 + h1, y2 + h2)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)
  const union = w1 * h1 + w2 * h2 - intersection
  return union > 0 ? intersection / union : 0
}

function getCollisionPoint(firstBox, secondBox) {
  const firstCenter = getBoxCenter(firstBox)
  const secondCenter = getBoxCenter(secondBox)
  return {
    x: Math.round((firstCenter.x + secondCenter.x) / 2),
    y: Math.round((firstCenter.y + secondCenter.y) / 2),
  }
}

function describeFrameArea(point, frameWidth, frameHeight) {
  if (!frameWidth || !frameHeight) return 'the camera frame'
  const horizontal = point.x < frameWidth / 3 ? 'left' : point.x > (frameWidth * 2) / 3 ? 'right' : 'center'
  const vertical = point.y < frameHeight / 3 ? 'top' : point.y > (frameHeight * 2) / 3 ? 'bottom' : 'middle'
  return `${vertical}-${horizontal} of the camera frame`
}

function normalizePairKey(first, second) {
  return [first, second].sort().join('-')
}

export default function CameraFeed() {
  const { accidents, addAccident } = useAccidentStore()
  const [stream, setStream] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [detections, setDetections] = useState([])
  const [fps, setFps] = useState(0)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationName, setLocationName] = useState(
    navigator?.geolocation ? 'Detecting location...' : 'Location unavailable',
  )
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const modelRef = useRef(null)
  const detectionTimerRef = useRef(null)
  const lastAccidentTimeRef = useRef({})
  const previousPairsRef = useRef({})
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
        `https://nominatim.openstreetmap.org/reverse?format=json&countrycodes=in&lat=${lat}&lon=${lng}`,
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

  const notifyUser = useCallback((title, body) => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      new Notification(title, { body })
      return
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body })
        }
      })
    }
  }, [])

  const reportAccident = useCallback(async ({ type, description, severity, objects, collisionTime, collisionPoint, collisionArea }) => {
    if (!currentLocation) {
      setError('India location is required before reporting camera collisions.')
      return
    }

    const newAccident = {
      id: `incident-${Date.now()}`,
      title: type,
      description,
      severity,
      type,
      timestamp: new Date().toISOString(),
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      location: locationName,
      // include rich object info (class, score, bbox)
      objects,
      collision_time: collisionTime,
      collision_point: collisionPoint,
      collision_area: collisionArea,
      source: 'camera',
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
          notifyUser(type, description)
          console.log('Incident reported to backend:', newAccident.id)
        }
      } catch (err) {
        console.error('Failed to report incident to backend:', err)
        // Still add to local store as fallback
        if (addAccident) {
          addAccident(newAccident)
        }
        notifyUser(type, description)
      }
    }
  }, [accidents, addAccident, currentLocation, locationName, notifyUser])

  // Function to detect accident patterns from multiple detections
  const analyzeForAccidents = useCallback((predictions) => {
    const collisionObjects = predictions.filter((p) => DETECTION_CLASSES.has(p.class))
    const now = Date.now()
    const collisionDate = new Date(now)
    const collisionTime = collisionDate.toISOString()
    const collisionTimeText = collisionDate.toLocaleString()

    if (collisionObjects.length >= 2) {
      for (let i = 0; i < collisionObjects.length; i++) {
        for (let j = i + 1; j < collisionObjects.length; j++) {
          const first = collisionObjects[i]
          const second = collisionObjects[j]
          const pairKey = normalizePairKey(`${first.class}-${i}`, `${second.class}-${j}`)
          const distance = calculateDistance(first.bbox, second.bbox)
          const overlap = calculateOverlap(first.bbox, second.bbox)
          const previous = previousPairsRef.current[pairKey]
          const closingFast = previous ? previous.distance - distance > 35 : false
          const likelyCollision = overlap >= COLLISION_IOU_THRESHOLD || (distance < COLLISION_DISTANCE_PX && closingFast)

          previousPairsRef.current[pairKey] = {
            distance,
            updatedAt: now,
          }

          if (likelyCollision && now - (lastAccidentTimeRef.current[pairKey] || 0) > COLLISION_COOLDOWN_MS) {
            lastAccidentTimeRef.current[pairKey] = now
            const firstName = first.class
            const secondName = second.class
            const collisionPoint = getCollisionPoint(first.bbox, second.bbox)
            const collisionArea = describeFrameArea(collisionPoint, videoRef.current?.videoWidth, videoRef.current?.videoHeight)
            const locationText = currentLocation
              ? `${locationName} (${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)})`
              : locationName

            // Build objects payload with class, score and bbox
            const payloadObjects = [
              { class: first.class, score: first.score, bbox: first.bbox },
              { class: second.class, score: second.score, bbox: second.bbox },
            ]

            reportAccident({
              type: 'Object Collision',
              description: `${firstName} collided with ${secondName} at ${collisionTimeText}. Collision happened at ${collisionArea} near pixel (${collisionPoint.x}, ${collisionPoint.y}). Location: ${locationText}.`,
              severity: firstName === 'person' || secondName === 'person' ? 5 : 4,
              objects: payloadObjects,
              collisionTime,
              collisionPoint,
              collisionArea,
            })
          }
        }
      }
    }
  }, [currentLocation, locationName, reportAccident])

  useEffect(() => {
    if (!navigator?.geolocation) return

    const geoWatcher = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        if (!isWithinIndia(latitude, longitude)) {
          setCurrentLocation(null)
          setLocationName('Current location is outside India')
          setError('Only current locations inside India are accepted.')
          return
        }
        setCurrentLocation({ lat: latitude, lng: longitude })
        setError('')
        setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        // Reverse geocode to get address
        fetchAddressFromCoordinates(latitude, longitude)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationName('Location permission denied')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )

    return () => navigator.geolocation.clearWatch(geoWatcher)
  }, [])

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
      videoRef.current.play().catch((err) => {
        setError(err?.message || 'Unable to start camera playback.')
        setStatus('error')
      })
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

  const waitForVideoReady = () => new Promise((resolve, reject) => {
    const video = videoRef.current
    if (!video) {
      reject(new Error('Camera video element is not available.'))
      return
    }

    const finish = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error('Camera stream could not start playback.'))
    }
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', finish)
      video.removeEventListener('canplay', finish)
      video.removeEventListener('error', fail)
    }

    if (video.readyState >= 2 && video.videoWidth > 0) {
      resolve()
      return
    }

    video.addEventListener('loadedmetadata', finish, { once: true })
    video.addEventListener('canplay', finish, { once: true })
    video.addEventListener('error', fail, { once: true })
  })

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported by this browser.')
      setStatus('error')
      return
    }

    setStatus('starting')
    setError('')

    try {
      // Prefer WebGL backend for performance; fall back to cpu if unavailable
      try {
        await tf.setBackend('webgl')
        await tf.ready()
      } catch (backendErr) {
        console.warn('WebGL backend not available, falling back to cpu', backendErr)
        try {
          await tf.setBackend('cpu')
          await tf.ready()
        } catch (cpuErr) {
          console.error('Failed to initialize tf backends', cpuErr)
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.muted = true
        await videoRef.current.play()
        await waitForVideoReady()
      }
      setStatus('loading-model')

      if (!modelRef.current) {
        try {
          console.log('Loading COCO-SSD model...')
          const loadedModel = await cocoSsd.load()
          modelRef.current = loadedModel
          setStatus('detecting')
          await startDetectionLoop()
        } catch (modelErr) {
          setError('Failed to load detection model. ' + (modelErr?.message || modelErr))
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
