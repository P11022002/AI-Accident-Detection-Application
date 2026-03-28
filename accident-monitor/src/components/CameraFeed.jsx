import { useEffect, useRef, useState } from 'react'
import '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const DETECTION_CLASSES = new Set(['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'fire hydrant'])

export default function CameraFeed() {
  const [stream, setStream] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [detections, setDetections] = useState([])
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const modelRef = useRef(null)
  const detectionTimerRef = useRef(null)

  const drawDetections = (predictions) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !predictions) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox
      const label = `${prediction.class} ${(prediction.score * 100).toFixed(0)}%`
      ctx.strokeStyle = 'rgba(95, 195, 255, 0.95)'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)
      ctx.fillStyle = 'rgba(2, 10, 25, 0.8)'
      ctx.fillRect(x, y - 26, ctx.measureText(label).width + 16, 24)
      ctx.fillStyle = '#fff'
      ctx.font = '13px Inter, system-ui, sans-serif'
      ctx.fillText(label, x + 8, y - 8)
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
    if (!videoRef.current || !modelRef.current || !stream) return

    const detect = async () => {
      if (!videoRef.current || !modelRef.current || !stream) return
      if (videoRef.current.readyState < 3) {
        detectionTimerRef.current = window.setTimeout(detect, 300)
        return
      }

      try {
        const predictions = await modelRef.current.detect(videoRef.current)
        const filtered = predictions.filter((prediction) => prediction.score >= 0.45 && DETECTION_CLASSES.has(prediction.class))
        setDetections(filtered)
        drawDetections(filtered)
      } catch (err) {
        console.error('Detection error', err)
      }

      detectionTimerRef.current = window.setTimeout(detect, 400)
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      setStream(mediaStream)
      setStatus('loading-model')

      if (!modelRef.current) {
        const loadedModel = await cocoSsd.load()
        modelRef.current = loadedModel
      }

      setStatus('detecting')
      await startDetectionLoop()
    } catch (err) {
      setError(err?.message || 'Unable to access the camera.')
      setStatus('error')
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
    idle: 'Camera is ready to start.',
    starting: 'Requesting camera permission...',
    'loading-model': 'Loading detection model...',
    detecting: detections.length ? `${detections.length} object${detections.length === 1 ? '' : 's'} detected` : 'Waiting for detection...',
    live: 'Live camera feed is active.',
    error: error || 'Camera feed could not start.',
  }

  return (
    <section className="camera-card">
      <div className="camera-header">
        <div>
          <p className="camera-label">Live camera feed</p>
          <h3>Use your PC camera</h3>
        </div>
        <div className={`camera-status ${status}`}>{statusText[status]}</div>
      </div>

      <div className="camera-preview">
        <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="camera-overlay" />
        {!stream && <div className="camera-placeholder">Start the camera to begin live detection.</div>}
      </div>

      <div className="camera-actions">
        <button className="camera-button start" type="button" onClick={startCamera} disabled={status === 'starting' || status === 'loading-model' || status === 'detecting'}>
          Start camera
        </button>
        <button className="camera-button stop" type="button" onClick={stopCamera} disabled={!stream}>
          Stop camera
        </button>
      </div>
    </section>
  )
}
