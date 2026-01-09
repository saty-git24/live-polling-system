# Live Polling System

A real-time polling web application for interactive classroom environments. Instructors can create and manage live polls, while students participate and view results instantly.

---

## Tech Stack

### Backend
- Node.js + Express.js
- TypeScript
- Socket.IO
- PostgreSQL (optional, in-memory fallback for development)
- dotenv

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Axios

---

## Features

### Instructor
- Create polls with 2–10 options
- Set poll duration (5–60 seconds)
- Monitor live voting results
- End polls manually or automatically
- View poll history
- Only one active poll allowed at a time

### Student
- Join live polls instantly
- One vote per poll
- View real-time results
- Mobile and desktop friendly UI

### System
- Real-time updates using WebSockets
- Automatic poll expiration
- Server-side concurrency validation
- In-memory storage fallback if database is unavailable

---

## Project Structure

```
live-polling-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── services/
    │   ├── types/
    │   └── App.tsx
    ├── package.json
    └── tsconfig.json
```

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- npm
- PostgreSQL (optional)

---

### Clone Repository
```bash
git clone https://github.com/saty-git24/live-polling-system.git
cd live-polling-system
```

---

### Backend Setup
```bash
cd backend
npm install
```

Create `.env` in `backend/`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=
CLIENT_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev
```

---

### Frontend Setup
```bash
cd frontend
npm install
```

Create `.env` in `frontend/`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

Start frontend:
```bash
npm start
```

Application runs at:
http://localhost:3000

---

## API Overview

### REST APIs
- GET `/api/polls/current`
- POST `/api/polls`
- POST `/api/polls/vote`
- POST `/api/polls/end`
- GET `/api/polls/history`

### WebSocket Events
- `poll:new`
- `poll:update`
- `poll:ended`
- `participant:list`

---

## Deployment Notes
- Configure PostgreSQL for production
- Set `NODE_ENV=production`
- Build frontend using `npm run build`
- Serve frontend via Netlify, Vercel, or S3
- Enable HTTPS and proper CORS settings

---

## Limitations
- No authentication
- Single active poll only
- In-memory storage during development
- No persistent user sessions

---

## Future Enhancements
- Authentication and authorization
- Multi-room polling
- Analytics dashboard
- Export results (CSV/PDF)
- Accessibility improvements

---

## Repository
https://github.com/saty-git24/live-polling-system

© 2026 Live Polling System — Educational Project
