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

## Tech Stack

Both the frontend and the backend are written end-to-end in **TypeScript** with `strict` mode enabled.

| Layer | Technology |
|-------|-----------|
| Frontend framework | **Next.js 16** (App Router) + React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Client state | Zustand (persisted to `localStorage`) |
| Maps | Leaflet + react-leaflet (loaded via `next/dynamic` with `ssr: false`) |
| Charts | Recharts |
| HTTP | Axios |
| Backend | **Node.js + Express 5**, TypeScript |
| Database | MongoDB + Mongoose (with `2dsphere` geospatial indexes) |
| Real-time | Socket.io (WebSocket, with long-polling fallback) |
| Auth | JWT access/refresh tokens in httpOnly cookies, bcrypt password hashing |
| AI | Google Gemini (`@google/genai`) with deterministic fallbacks |
| Uploads | Multer + Cloudinary |

---

## Quick Start

### Environment Setup

Copy the example env files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Installation & Running

```bash
# Clone the repository
git clone <repository-url>
cd near-help

# Make scripts executable
chmod +x setup.sh web.sh

# Install dependencies and build both apps
./setup.sh

# Start the application (backend + frontend)
./web.sh
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### Development mode

Run each app in its own terminal for hot reload:

```bash
cd backend  && npm run dev   # tsx watch — restarts on .ts changes
cd frontend && npm run dev   # next dev
```

### Useful scripts

| Command | Location | What it does |
|---------|----------|--------------|
| `npm run dev` | backend | Run the API with `tsx watch` (no build step) |
| `npm run build` | backend | Compile TypeScript to `dist/` |
| `npm start` | backend | Run the compiled server from `dist/` |
| `npm run typecheck` | backend | Type-check without emitting |
| `npm run dev` | frontend | Next.js dev server on port 3000 |
| `npm run build` | frontend | Production build |
| `npm start` | frontend | Serve the production build |
| `npm run typecheck` | frontend | Type-check without emitting |
| `npm run lint` | frontend | ESLint (`eslint-config-next`) |

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

### Frontend routes (Next.js App Router)

All pages are Client Components — the app is realtime and geolocation-driven, so it
renders on the client and is protected by the `AuthGuard` / `GuestGuard` wrappers.

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Redirects to `/dashboard` |
| `/login` | `src/app/login/page.tsx` | Sign in (guest-only) |
| `/register` | `src/app/register/page.tsx` | Sign up (guest-only) |
| `/dashboard` | `src/app/dashboard/page.tsx` | SOS button, nearby incidents, skills, guardians, welfare checks |
| `/sos/[sosId]` | `src/app/sos/[sosId]/page.tsx` | Live incident map, responder chat, AI assistant |
| `/history` | `src/app/history/page.tsx` | Past broadcasts and responses |
| `/admin` | `src/app/admin/page.tsx` | Analytics and moderation (admin-only) |

### Shared frontend modules

- **`src/types/index.ts`**: Domain types mirroring the Mongoose models
- **`src/services/api.ts`**: Typed Axios client — every endpoint returns `ApiEnvelope<T>`
- **`src/services/socket.ts`**: Socket.io client and typed emit helpers
- **`src/components/AuthGuard.tsx`**: Client-side route protection
- **`src/components/maps/`**: Leaflet maps, all `next/dynamic` + `ssr: false`

### Backend structure

- **`models/`**: Mongoose schemas with typed instance methods and lifecycle hooks
- **`controllers/`**: HTTP request handling
- **`services/locationService.ts`**: In-memory live responder positions + Haversine proximity
- **`services/dispatchService.ts`**: Weighted responder ranking (ETA / skill / trust)
- **`socket/index.ts`**: Socket.io auth middleware and all realtime event handlers
- **`utils/aiService.ts`**: Google Gemini integration with deterministic fallbacks
- **`utils/ApiError.ts` / `ApiResponse.ts`**: Typed response envelopes
- **`utils/cloudinary.ts`**: Image upload and management

---

**Made with love**
