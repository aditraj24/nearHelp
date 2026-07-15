# NearHelp

> **Emergency Response, Community Care, Real Time Support**

A comprehensive emergency response and community care platform designed to connect people in crisis with nearby responders and resources in real-time.

## Features

### Core Features

- **SOS Alert System**: Send emergency alerts to nearby responders with real-time location tracking
- **Resource Map**: Locate nearby emergency resources (hospitals, police stations, fire departments, etc.)
- **Guardian Mode**: Designate guardians to monitor your safety and receive alerts
- **Responder Rating**: Rate responders after emergency assistance
- **AI Crisis Chat**: AI-powered chatbot for crisis support and guidance
- **Offline SOS Queue**: Queue SOS alerts when offline; they send when connection is restored
- **Welfare Checks**: Follow-up welfare checks after emergency events
- **Admin Dashboard**: Comprehensive analytics and SOS management for administrators
- **Secure Authentication**: JWT-based authentication with role-based access control
- **False Alert Detection**: Flag and track false emergencies

---


## Quick Start

### Environment Setup

Copy the example env files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Installation & Running

```bash
# Clone the repository
git clone <repository-url>
cd web-hack

# Make scripts executable
chmod +x setup.sh web.sh

# Install all dependencies (backend + frontend)
./setup.sh

# Start the application (backend + frontend)
./web.sh
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
---

## API Endpoints

### Health Check

```
GET /health
```
---

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login user |
| POST | `/logout` | Logout user (requires auth) |
| GET | `/profile` | Get user profile (requires auth) |
| PUT | `/profile` | Update user profile (requires auth) |
| GET | `/guardians` | Get user's guardians (requires auth) |
| POST | `/guardians` | Add a guardian (requires auth) |
| DELETE | `/guardians/:guardianId` | Remove a guardian (requires auth) |
| GET | `/wards` | Get user's wards (requires auth) |

---

### SOS (`/api/sos`)

All endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create SOS alert |
| GET | `/active` | Get active SOS alerts |
| GET | `/pending` | Get pending SOS alerts |
| GET | `/history` | Get SOS history |
| GET | `/welfare-checks` | Get pending welfare checks |
| GET | `/:sosId` | Get specific SOS alert |
| PUT | `/:sosId/resolve` | Resolve SOS alert |
| POST | `/:sosId/welfare-check` | Respond to welfare check |
| POST | `/:sosId/rate/:responderId` | Rate responder (1-5 stars) |
| POST | `/:sosId/flag` | Flag as false alert |

---

### Resources (`/api/resources`)

All endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/seed` | Seed database with resources |
| POST | `/` | Add new resource |
| GET | `/nearby` | Get nearby resources (based on location) |
| GET | `/` | Get all resources |

---

### AI Chatbot (`/api/ai`)

All endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Send message to AI crisis chatbot |

---

### Admin (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get admin dashboard (requires admin auth) |

---

## Easter Egg

### How to Unlock

1. Navigate to the **Dashboard** page
2. Click the **NearHelp logo** in the top-left corner
3. Click it **5 times within 2 seconds**

### What You'll See
- Try it once.... :-)

---

## Configuration

### Database

NearHelp uses MongoDB with the following collections:

- **users**: User profiles and authentication data
- **sos_alerts**: Emergency SOS records
- **resources**: Emergency resources (hospitals, police, etc.)
- **welfare_checks**: Welfare follow-up records

### Real-time Communication

Socket.io is used for:
- Live SOS alert broadcasts
- Real-time responder location updates
- Welfare check notifications
- Chat messages

### Security

- **JWT Authentication**: All protected endpoints require valid JWT token
- **Password Hashing**: bcrypt with salt rounds
- **CORS**: Configured for frontend origin validation
- **Environment Variables**: Sensitive data stored in `.env` files

---

## Key Components

### Frontend Pages

- **Dashboard**: Main user interface with map and SOS controls
- **AdminDashboard**: Analytics and SOS management
- **SOSBroadcast**: Broadcast SOS alerts to responders
- **History**: View past SOS incidents
- **Login/Register**: Authentication pages
- **ResourceMap**: Interactive resource locator

### Backend Services

- **locationService.js**: Geolocation and proximity calculations
- **dispatchService.js**: SOS dispatch and responder assignment
- **aiService.js**: Google Generative AI integration for chatbot
- **cloudinary.js**: Image upload and management

---

**Made with love**
