import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import pollRoutes from './routes/pollRoutes';
import { initializeSocketHandlers, restoreActivePollTimers } from './sockets/pollSocket';
import { setIo } from './sockets/socketServer';

dotenv.config();

const app = express();
const httpServer = createServer(app);
// Allow the frontend origin(s). In development reflect the request origin
// so local network addresses (e.g. http://192.168.x.x:3000) work.
const corsOptions = (process.env.NODE_ENV === 'production')
  ? { origin: process.env.CLIENT_URL, credentials: true }
  : { origin: true, credentials: true };

const io = new Server(httpServer, {
  cors: corsOptions as any
});

// make io available to controllers via socketServer.getIo()
setIo(io);

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/polls', pollRoutes);

initializeSocketHandlers(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeDatabase();
    // Restore any active poll timers so polls end correctly after restart
    try {
      await restoreActivePollTimers(io);
    } catch (err) {
      console.error('Error restoring poll timers:', err);
    }

    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Socket.io initialized`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});