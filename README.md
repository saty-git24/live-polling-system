# Live Polling System

## Project Overview

The Live Polling System is a real-time, interactive polling application designed to facilitate seamless communication between instructors and students in educational environments. This full-stack application leverages modern web technologies to enable instructors to create polls, monitor live responses, and analyze voting patterns while students participate in real-time polling sessions through an intuitive interface.

## Technical Architecture

### Technology Stack

**Backend:**
- Node.js with Express.js framework
- TypeScript for type-safe server-side development
- Socket.IO for bidirectional real-time communication
- PostgreSQL for persistent data storage
- dotenv for environment configuration management

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for responsive UI design
- Socket.IO Client for real-time updates
- Axios for HTTP API communication
- Create React App as the build toolchain

### Repository Structure

```
live-polling-system/
├── backend/          # Server-side application
│   ├── src/
│   │   ├── config/        # Database and configuration files
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Data models
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # Business logic layer
│   │   ├── sockets/       # WebSocket event handlers
│   │   └── server.ts      # Application entry point
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/         # Client-side application
    ├── src/
    │   ├── components/    # React components
    │   ├── services/      # API and Socket services
    │   ├── types/         # TypeScript type definitions
    │   └── App.tsx        # Application root component
    ├── package.json
    └── tsconfig.json
```

## Core Features

### Instructor Capabilities
- **Poll Creation:** Design custom polls with 2-10 configurable options
- **Real-Time Monitoring:** Track student participation and voting patterns live
- **Poll Management:** Control poll lifecycle (start, monitor, end)
- **Historical Analysis:** Access comprehensive polling history and statistics
- **Smart Poll Creation:** System enforces that new polls can only be created when no active poll exists or all connected students have responded

### Student Capabilities
- **Real-Time Participation:** Join active polling sessions instantly
- **One-Vote Policy:** Submit a single vote per poll with immediate confirmation
- **Live Results:** View real-time vote distribution and statistics
- **Responsive Interface:** Seamless experience across desktop and mobile devices

### Technical Highlights
- **Resilient Architecture:** Automatic fallback to in-memory storage when database is unavailable (suitable for development and testing)
- **Concurrency Control:** Server-side validation prevents poll conflicts
- **Auto-expiration:** Polls automatically terminate after the configured duration
- **Connection Management:** Real-time participant tracking and connection state management

---

## Installation & Setup

### Prerequisites

Ensure the following are installed on your development machine:

- **Node.js** (v18.x or higher recommended)
- **npm** (v9.x or higher)
- **PostgreSQL** (v14.x or higher) - Optional for development; required for production
- **Git** for version control

### Step 1: Clone the Repository

```bash
git clone https://github.com/saty-git24/live-polling-system.git
cd live-polling-system
```

### Step 2: Backend Configuration

#### Install Dependencies

```bash
cd backend
npm install
```

#### Environment Configuration

Create a `.env` file in the `backend/` directory with the following configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (PostgreSQL)
# For production or persistent storage:
DATABASE_URL=postgresql://username:password@localhost:5432/polling_db

# For development without database (uses in-memory storage):
# DATABASE_URL=

# CORS Configuration
# In production, specify your frontend URL:
CLIENT_URL=http://localhost:3000
```

**Environment Variables Explained:**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Backend server port | No | 5000 |
| `NODE_ENV` | Environment mode (`development` or `production`) | No | development |
| `DATABASE_URL` | PostgreSQL connection string | No* | None |
| `CLIENT_URL` | Frontend URL for CORS (production only) | No** | localhost |

\* The application will function without `DATABASE_URL` by using in-memory storage (suitable for local development only).  
\** Only required in production environments for CORS configuration.

#### Database Setup (Optional for Development)

If you wish to use PostgreSQL for persistent storage:

1. **Create the database:**
   ```bash
   createdb polling_db
   ```

2. **Update the `.env` file** with your PostgreSQL credentials:
   ```env
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/polling_db
   ```

3. **Database tables are created automatically** when the server starts for the first time.

#### Start the Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production build and start
npm run build
npm start
```

The backend server will start on `http://localhost:5000` (or your configured PORT).

**Expected Console Output:**
```
✅ Database connected
✅ Database tables created/verified
✅ Server running on port 5000
✅ Socket.io initialized
```

If the database connection fails, you will see:
```
⚠️ Database connection failed (continuing without DB)
```

### Step 3: Frontend Configuration

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
```

#### Environment Configuration

Create a `.env` file in the `frontend/` directory:

```env
# Backend API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

**Environment Variables Explained:**

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend REST API endpoint | `http://localhost:5000/api` |
| `REACT_APP_SOCKET_URL` | Backend WebSocket endpoint | `http://localhost:5000` |

#### Start the Frontend Application

```bash
npm start
```

The application will automatically open in your default browser at `http://localhost:3000`.

---

## Usage Guide

### For Instructors

1. **Access the Application:** Navigate to `http://localhost:3000`
2. **Select Role:** Choose "Teacher" from the role selection interface
3. **Create a Poll:**
   - Enter your poll question
   - Add 2-10 answer options
   - Set poll duration (5-60 seconds)
   - Click "Create Poll"
4. **Monitor Results:** View real-time vote distribution and participant count
5. **End Poll:** Manually end the poll or wait for automatic expiration
6. **View History:** Access past polls and their final results

### For Students

1. **Access the Application:** Navigate to `http://localhost:3000`
2. **Select Role:** Choose "Student" from the role selection interface
3. **Join Active Poll:** Active polls appear automatically
4. **Submit Vote:** Select your answer and submit
5. **View Results:** See real-time voting statistics

---

## API Documentation

### REST Endpoints

#### Get Current Active Poll
```http
GET /api/polls/current
```
**Response:** Returns the currently active poll or `null`.

#### Create New Poll
```http
POST /api/polls
Content-Type: application/json

{
  "question": "string",
  "options": ["string", "string", ...],
  "duration": number (5-60 seconds)
}
```

#### Submit Vote
```http
POST /api/polls/vote
Content-Type: application/json

{
  "pollId": "string",
  "studentId": "string",
  "optionId": "string"
}
```

#### End Poll
```http
POST /api/polls/end
Content-Type: application/json

{
  "pollId": "string"
}
```

#### Get Poll History
```http
GET /api/polls/history
```

### WebSocket Events

#### Server → Client Events

- `poll:new` - New poll created
- `poll:update` - Vote submitted, results updated
- `poll:ended` - Poll has ended
- `participant:list` - Updated list of connected participants

#### Client → Server Events

- `user:join` - User joins with role (teacher/student)
- `user:disconnect` - User disconnects

---

## Development Guidelines

### Code Quality Standards

- Follow TypeScript strict mode conventions
- Maintain consistent code formatting
- Write descriptive commit messages
- Document complex business logic

### Testing Considerations

- Test real-time communication with multiple browser windows
- Verify poll creation restrictions (active poll + pending student votes)
- Test database failover to in-memory storage
- Validate input constraints (option count, duration limits)

### Debugging Tips

- **Backend logs:** Monitor console output for database connection status and vote processing
- **Network tab:** Inspect WebSocket frames and HTTP requests
- **React DevTools:** Examine component state and props
- **Database inspection:** Query PostgreSQL directly to verify data persistence

---

## Deployment

### Production Checklist

1. **Database Configuration:**
   - Provision a production PostgreSQL instance
   - Configure `DATABASE_URL` with production credentials
   - Enable SSL connections (`NODE_ENV=production`)

2. **Backend Deployment:**
   ```bash
   cd backend
   npm run build
   NODE_ENV=production PORT=5000 npm start
   ```

3. **Frontend Build:**
   ```bash
   cd frontend
   npm run build
   ```
   Serve the `build/` directory using a static hosting service (Netlify, Vercel, AWS S3, etc.)

4. **Environment Variables:**
   - Set `CLIENT_URL` to your production frontend URL
   - Configure CORS appropriately for your domain
   - Use environment variable management tools (e.g., AWS Secrets Manager, Heroku Config Vars)

5. **Security Considerations:**
   - Implement authentication (JWT, OAuth)
   - Enable HTTPS/TLS encryption
   - Configure rate limiting
   - Sanitize user inputs
   - Implement proper error handling without exposing sensitive information

---

## System Requirements

### Minimum Requirements
- **CPU:** Dual-core processor
- **RAM:** 4 GB
- **Node.js:** v18.0.0 or higher
- **Browser:** Modern browser with WebSocket support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Recommended for Production
- **CPU:** Quad-core processor
- **RAM:** 8 GB
- **Database:** Dedicated PostgreSQL instance with automated backups
- **Network:** Low-latency connection for optimal real-time performance

---

## Known Limitations & Future Enhancements

### Current Limitations
- No authentication or authorization system
- In-memory storage in development mode (data lost on server restart)
- Single poll active at a time
- No persistent user sessions

### Potential Enhancements
- User authentication and authorization
- Multi-room support for concurrent polls
- Enhanced analytics dashboard
- Export poll results (CSV, PDF)
- Poll templates and question banks
- Mobile native applications
- Accessibility improvements (WCAG 2.1 compliance)

---

## Troubleshooting

### Backend Won't Start
- **Check Node.js version:** `node --version` (should be 18+)
- **Verify dependencies:** Run `npm install` in the backend directory
- **Database connection:** If PostgreSQL is configured, ensure it's running and credentials are correct
- **Port conflict:** Ensure port 5000 is not in use by another application

### Frontend Connection Issues
- **Verify backend is running:** Check `http://localhost:5000/health`
- **Check environment variables:** Ensure `.env` file exists in `frontend/` with correct URLs
- **CORS errors:** Verify `CLIENT_URL` in backend `.env` matches frontend URL
- **Clear browser cache:** Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### WebSocket Connection Failed
- **Firewall:** Ensure firewall allows WebSocket connections
- **Proxy/VPN:** Some proxies block WebSocket traffic
- **Browser console:** Check for specific error messages

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow existing code style** and TypeScript conventions
3. **Write clear commit messages** describing your changes
4. **Test thoroughly** before submitting
5. **Submit a Pull Request** with a detailed description of changes

---

## License

This project is developed as an educational assignment and demonstration of full-stack development capabilities.

---

## Contact & Support

For questions, issues, or feature requests, please open an issue on the GitHub repository.

**Repository:** [https://github.com/saty-git24/live-polling-system](https://github.com/saty-git24/live-polling-system)

---

**© 2026 Live Polling System - Educational Project**