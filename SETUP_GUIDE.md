# Frontend-Backend Connection Setup Guide

This guide explains how to connect the AI Accident Detection Frontend (React) with the Backend (Django).

## 📋 Prerequisites

- Python 3.8+ (for Django backend)
- Node.js 16+ (for React frontend)
- pip (Python package manager)
- npm (Node package manager)

## 🔧 Backend Setup (Django)

### 1. Navigate to Backend Directory
```bash
cd ai_accident_project
```

### 2. Create Virtual Environment (Optional but Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install django>=6.0
```

### 4. Run Migrations
```bash
python manage.py migrate
```

### 5. Start Django Development Server
```bash
python manage.py runserver
```

**Expected Output:**
```
Starting development server at http://127.0.0.1:8000/
```

### Testing Backend API
Open your browser and navigate to:
```
http://127.0.0.1:8000/api/accidents/
```

You should see JSON response with accident data.

## 🎨 Frontend Setup (React + Vite)

### 1. Navigate to Frontend Directory
```bash
cd accident-monitor
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify Environment Configuration
Check the `.env` file:
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

If your backend is on a different host/port, update this URL accordingly.

### 4. Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
VITE v8.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

## 🔄 How Frontend and Backend Communicate

### Data Flow

1. **Frontend** (React) makes API requests to backend
2. **Backend** (Django) processes requests and returns JSON
3. **Frontend** displays data in real-time

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/accidents/` | GET | Fetch all incidents |
| `/api/accidents/` | POST | Create new incident (from camera detection) |

### Example Frontend API Call

```javascript
// From: src/services/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  timeout: 10000,
})

// GET incidents
api.get('/accidents/')

// POST new incident
api.post('/accidents/', {
  title: 'Detected Collision',
  description: 'Collision detected via camera',
  severity: 4,
  type: 'Collision',
  lat: 37.7836,
  lng: -122.4089,
  location: 'Market St, San Francisco, CA'
})
```

## 🚀 Running Both Together

### Terminal 1 - Backend
```bash
cd ai_accident_project
python manage.py runserver
```

### Terminal 2 - Frontend
```bash
cd accident-monitor
npm run dev
```

### Terminal 3 - Camera Detection (Optional)
Start the camera if you want real-time detection:
- Open http://localhost:5173 in browser
- Click "Start camera" button in the sidebar

## ⚙️ CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

**File:** `ai_accident_project/ai_accident_project/settings.py`

To add more allowed origins:
```python
CORS_ALLOWED_ORIGINS = [
    'http://yourhost:yourport',
    # ... other origins
]
```

## 🔌 Middleware Configuration

The backend includes custom CORS middleware for handling cross-origin requests:

**File:** `ai_accident_project/ai_accident_project/middleware.py`

This middleware:
- Handles preflight OPTIONS requests
- Sets CORS headers on all responses
- Allows GET, POST requests
- Allows Content-Type and Authorization headers

## 📊 Features

### Frontend Features
- ✅ Real-time incident monitoring
- ✅ Live camera feed with object detection
- ✅ Interactive map visualization
- ✅ Incident filtering and sorting
- ✅ Status indicators and alerts

### Backend Features
- ✅ REST API for incident management
- ✅ Support for creating new incidents (from camera detection)
- ✅ CORS enabled for frontend communication
- ✅ Error handling with proper HTTP status codes
- ✅ JSON response format

## 🐛 Troubleshooting

### Issue: "Unable to fetch live alerts" error

**Solution:**
1. Ensure Django backend is running: `python manage.py runserver`
2. Check CORS configuration in `settings.py`
3. Verify frontend `.env` has correct API URL
4. Check browser console for specific error messages

### Issue: CORS Error

**Solution:**
1. Make sure backend has correct ALLOWED_HOSTS in `settings.py`
2. Verify CorsMiddleware is enabled in MIDDLEWARE list
3. Check CORS_ALLOWED_ORIGINS includes your frontend URL

### Issue: Port Already in Use

**Django (Backend):**
```bash
python manage.py runserver 8001  # Use different port
```

**Vite (Frontend):**
```bash
npm run dev -- --port 5174  # Use different port
```

Then update `.env` with new backend URL if needed.

## 📝 Next Steps

1. **Database Integration**: Replace in-memory storage with Django models
2. **Authentication**: Add user authentication with tokens
3. **Real Database**: Switch from SQLite to PostgreSQL
4. **Deployment**: Deploy frontend to Vercel/Netlify and backend to Heroku/AWS
5. **WebSocket**: Add real-time updates using Django Channels

## 📞 Support

For issues or questions:
1. Check browser console for API errors
2. Check Django terminal output for backend errors
3. Verify all ports are correct and services are running
4. Ensure Internet connectivity for camera detection features

---

**Last Updated:** April 24, 2026
**Status:** ✅ Connected and Ready
