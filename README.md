# Live Polling System

>A simple live polling application (teacher + students) with real-time updates via Socket.IO. This repository contains a TypeScript/Node backend and a React + TypeScript frontend.

---

## Repository layout

- `backend/` — Express + TypeScript server, Socket.IO handlers, and poll business logic.
- `frontend/` — React (CRA) + TypeScript single-page app with Tailwind styles.

---

## Features

- Create live polls from the teacher UI
- Students join and submit votes in real time
- Teacher can end polls and view history
- Server-enforced rule: teacher may ask a new question only when there is no active poll OR all connected students have answered
- In-memory fallback when the Postgres DB is not available (for local development)

---

## Prerequisites

- Node.js (18+ recommended) and npm installed
- (Optional) PostgreSQL if you want persistent storage — otherwise the server will use an in-memory fallback for development

---

## Quick start (development)

1. Clone the repository (if not already):

```powershell
git clone https://github.com/saty-git24/live-polling-system.git
cd live-polling
```

2. Backend

```powershell
cd backend
npm install
# Start the backend in dev mode (uses nodemon + ts-node)
npm run dev
```

The backend listens on `PORT` (default `5000`). The server exposes HTTP API under `/api` and initializes Socket.IO on the same port.

3. Frontend

Open a second terminal and run:

```powershell
cd frontend
npm install
npm start
```

The frontend dev server runs on `http://localhost:3000` by default and connects to the backend API/socket using environment variables.

### Frontend environment variables

Edit `frontend/.env` (or create one) to point the client at the backend if your backend runs on a different host/port:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

The app uses these variables to connect sockets and call the REST API.

---

## Important behavior notes

- Server-side enforcement: `POST /api/polls` (create poll) will reject when there's an active poll and some connected students have not yet voted. This prevents accidental replacement of an active question. If you want a force-create option, consider adding a server-side `force` flag or only allowing this action from authenticated teachers (not implemented by default).
- If the backend cannot connect to Postgres, it will run with an in-memory poll store so you can continue development without DB setup. Data will not be persisted across server restarts in that mode.

---

## API endpoints (selected)

- `GET /api/polls/current` — returns the current active poll (or `null`)
- `POST /api/polls` — create a new poll (body: `{ question, options: string[], duration }`)
- `POST /api/polls/vote` — submit a vote (body: `{ pollId, studentId, optionId }`)
- `POST /api/polls/end` — end active poll (body: `{ pollId }`)
- `GET /api/polls/history` — get recent ended polls

Sockets: the app uses Socket.IO to broadcast `poll:new`, `poll:update`, `poll:ended`, and `participant:list` among others.

---

## Development tips

- When testing the teacher rule that prevents creating a new poll, make sure student clients are connected (they appear in `participant:list`) and have actually submitted votes — otherwise a new poll will be refused.
- Inspect backend logs for debugging messages — the service logs when it falls back to in-memory mode and logs vote/create actions.

---

## Deploying / Production notes

- Configure a proper Postgres instance and set connection values in `backend/.env` or your deployment environment.
- In production, run `npm run build` in `frontend/` and serve the static build from a CDN or static host.
- The current project does not include authentication — consider adding it before deploying to public environments if you need access controls.

---

## Contributing

1. Create a feature branch
2. Open a PR against `main` with a clear description

---

If you'd like, I can also add a minimal `README` to each subfolder, add a CI workflow (GitHub Actions), or push this file to the repository for you. Tell me which next step you'd like.

---

© Live Polling System# live-polling-system
