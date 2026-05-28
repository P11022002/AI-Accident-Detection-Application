# Frontend-Backend Integration Summary

## ✅ Connection Status

The AI Accident Detection application is now fully connected with frontend-backend integration!

## 📦 What Was Connected

### Backend (Django)
- **Location:** `ai_accident_project/`
- **API Endpoint:** `http://127.0.0.1:8000/api/accidents/`
- **Port:** 8000

### Frontend (React + Vite)
- **Location:** `accident-monitor/`
- **Dev Server:** `http://localhost:5173/`
- **Port:** 5173

## 🔗 Connection Points

### 1. API Service Layer
**File:** `accident-monitor/src/services/api.js`
```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  timeout: 10000,
})
```

### 2. Environment Configuration
**File:** `accident-monitor/.env`
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### 3. CORS Configuration
**File:** `ai_accident_project/ai_accident_project/settings.py`
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

### 4. API Routes
**File:** `ai_accident_project/ai_accident_project/urls.py`
```python
urlpatterns = [
    path('api/accidents/', api.accidents_view, name='accidents_list'),
]
```

## 📡 Data Flow

```
Frontend React App
        ↓
API Service (Axios)
        ↓
HTTP Request (GET/POST)
        ↓
Django Backend
        ↓
API View (accidents_view)
        ↓
JSON Response
        ↓
Frontend Components (Display)
```

## 🚀 Quick Start Commands

### Terminal 1 - Start Backend
```bash
cd ai_accident_project
python manage.py runserver
```
✅ Backend runs on: `http://127.0.0.1:8000`

### Terminal 2 - Start Frontend
```bash
cd accident-monitor
npm install  # (if not done yet)
npm run dev
```
✅ Frontend runs on: `http://localhost:5173`

## 📊 API Endpoints

### GET /api/accidents/
Fetch all incidents from backend

**Response:**
```json
{
  "success": true,
  "count": 3,
  "results": [
    {
      "id": "A-001",
      "title": "Multi-vehicle collision",
      "description": "Heavy traffic collision...",
      "severity": 4,
      "type": "Collision",
      "timestamp": "2026-03-27T08:45:00Z",
      "lat": 37.7836,
      "lng": -122.4089,
      "location": "Market St, San Francisco, CA",
      "status": "active"
    }
  ],
  "timestamp": "2026-04-24T10:30:00Z"
}
```

### POST /api/accidents/
Create new incident (from camera detection)

**Request:**
```json
{
  "title": "Detected Collision",
  "description": "Collision detected via camera",
  "severity": 4,
  "type": "Collision",
  "lat": 37.7836,
  "lng": -122.4089,
  "location": "Market St, San Francisco, CA"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Incident created successfully",
  "incident": {
    "id": "incident-1706000000000",
    "title": "Detected Collision",
    ...
  }
}
```

## 🔄 Features Working

### Frontend Features
- ✅ Fetch incidents from backend on load
- ✅ Display incidents in real-time
- ✅ Filter and sort incidents
- ✅ Camera detection with accident analysis
- ✅ Auto-refresh functionality
- ✅ Map visualization of incidents

### Backend Features
- ✅ REST API to serve incidents
- ✅ Accept new incidents from camera detection
- ✅ CORS support for frontend communication
- ✅ Error handling
- ✅ HTTP status codes (200, 201, 400, 500)

## 🔧 Configuration Files Modified

| File | Changes |
|------|---------|
| `ai_accident_project/settings.py` | Added CORS, ALLOWED_HOSTS, middleware |
| `ai_accident_project/urls.py` | Added API route `/api/accidents/` |
| `ai_accident_project/api.py` | Enhanced with POST support, error handling |
| `accident-monitor/.env` | Created with API endpoint configuration |
| `accident-monitor/src/components/CameraFeed.jsx` | Added backend API integration |

## 📝 Testing the Connection

### 1. Test Backend API Directly
```bash
# Using curl
curl http://127.0.0.1:8000/api/accidents/

# Or open in browser
http://127.0.0.1:8000/api/accidents/
```

### 2. Test Frontend
Open `http://localhost:5173` in browser
- You should see incidents displayed in the sidebar
- Camera should be able to detect and create incidents
- All data should sync with backend

### 3. Test Camera Detection
1. Click "Start camera" button
2. When collision is detected, it sends data to backend
3. New incident appears in Real-time Alerts list
4. Check backend to verify it was saved

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Unable to fetch live alerts" | Check backend is running on port 8000 |
| CORS error | Verify CORS_ALLOWED_ORIGINS in settings.py |
| Camera not detecting | Check browser console for errors, ensure camera permission |
| API timeout | Increase timeout in `api.js` from 10000 to 30000ms |
| Port already in use | Change port: `python manage.py runserver 8001` |

## 📂 Project Structure

```
AI Accident detection application/
├── ai_accident_project/           (🔧 Backend - Django)
│   ├── api.py                    (✨ API endpoints)
│   ├── settings.py               (⚙️ Configuration)
│   ├── urls.py                   (🔗 Routes)
│   ├── middleware.py             (🔄 CORS)
│   └── manage.py
│
├── accident-monitor/              (⚛️ Frontend - React)
│   ├── .env                      (🔐 Configuration)
│   ├── src/
│   │   ├── services/api.js       (📡 API Client)
│   │   ├── components/
│   │   │   ├── CameraFeed.jsx    (📷 Detection)
│   │   │   ├── AlertSidebar.jsx  (📋 List)
│   │   │   └── ...
│   │   └── ...
│   └── package.json
│
└── SETUP_GUIDE.md               (📖 Documentation)
```

## 🎯 Next Steps

1. **Database Integration**
   - Create Django models for Accident table
   - Persist incidents in database

2. **Authentication**
   - Add user login/registration
   - Use JWT tokens

3. **Real-time Updates**
   - Implement WebSockets with Django Channels
   - Live incident notifications

4. **Deployment**
   - Deploy backend to cloud (Heroku, AWS, DigitalOcean)
   - Deploy frontend to CDN (Vercel, Netlify)

## 🎓 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │ StatusHeader | MapView | AlertSidebar            │   │
│  │ ┌─────────────────────────────────────────────┐  │   │
│  │ │ CameraFeed (TensorFlow.js Detection)        │  │   │
│  │ └─────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                    ↓ Axios API Client                    │
└─────────────────────────────────────────────────────────┘
         ↓↑ HTTP (GET/POST) + CORS
┌─────────────────────────────────────────────────────────┐
│               BACKEND (Django REST API)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ URL Routes: /api/accidents/                      │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ View: accidents_view()                           │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Storage: In-memory (→ Database in future)        │   │
│  └──────────────────────────────────────────────────┘   │
│              Middleware: CORS + Auth                     │
└─────────────────────────────────────────────────────────┘
```

---

**Status:** ✅ Fully Connected
**Last Updated:** April 24, 2026
