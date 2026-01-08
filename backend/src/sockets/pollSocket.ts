import { Server, Socket } from 'socket.io';
import { pollService } from '../services/pollService';

/** Timers for active polls: pollId -> NodeJS.Timeout */
const pollTimers = new Map<string, NodeJS.Timeout>();

/** Participant record stored by socket id */
type Role = 'teacher' | 'student';
interface Participant {
  id: string;
  name: string;
  role: Role;
}

/** Chat message shape we emit to clients */
interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  role: Role | string;
  time: number;
}

/** Kick payload for incoming requests */
interface KickPayload {
  targetSocketId?: string;
  senderSocketId?: string;
  senderRole?: string;
}

const participants = new Map<string, Participant>();

/** Helpers */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function broadcastParticipantList(io: Server) {
  io.emit('participant:list', Array.from(participants.entries()).map(([socketId, p]) => ({ socketId, ...p })));
}

function buildChatMessage(participant: Participant | undefined, msg: any, socketId: string): ChatMessage {
  const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
  const senderId = participant?.id ?? msg?.senderId ?? socketId;
  const providedName = typeof msg?.senderName === 'string' && msg.senderName.trim() ? msg.senderName.trim() : undefined;
  let senderName = (participant && participant.name && participant.name !== 'Anonymous') ? participant.name : (providedName ?? 'Anonymous');
  const role = (participant?.role ?? (msg?.role ?? 'student')) as Role | string;
  if (role === 'teacher') {
    senderName = senderName ? capitalize(senderName) : 'Teacher';
  }

  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    senderId,
    senderName,
    role,
    time: Date.now(),
  };
}

function isAuthorizedKick(requester: Participant | undefined, payload: KickPayload, socketId: string) {
  const payloadSenderRole = payload?.senderRole;
  const payloadSenderSocket = payload?.senderSocketId;
  return (requester && requester.role === 'teacher') || (payloadSenderRole === 'teacher' && payloadSenderSocket === socketId);
}

/** Exposed initializer that wires socket handlers. Handlers delegate to small helpers below. */
export function initializeSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send current poll state to the newly connected client
    handleGetCurrentPoll(socket);

    socket.on('participant:join', (data) => handleParticipantJoin(io, socket, data));
    socket.on('chat:send', (msg) => handleChatSend(io, socket, msg));
    socket.on('participant:kick', (payload: KickPayload) => handleParticipantKick(io, socket, payload));
    socket.on('poll:create', async (data) => await handlePollCreate(io, data));
    socket.on('poll:vote', async (data) => await handleVote(io, socket, data));
    // allow clients to request the current participant list (useful for late-joining teacher UI)
    socket.on('participant:list:request', () => {
      try {
        const list = Array.from(participants.entries()).map(([socketId, p]) => ({ socketId, id: p.id, name: p.name, role: p.role }));
        socket.emit('participant:list', list);
      } catch (err) {
        console.error('Error responding to participant:list:request', err);
      }
    });

    socket.on('disconnect', () => handleDisconnect(io, socket));
  });
}

/** Handle participant join event */
function handleParticipantJoin(io: Server, socket: Socket, data: any) {
  const { id, name, role } = data || {};
  const rawName = typeof name === 'string' && name.trim() ? name.trim() : undefined;
  const displayName = rawName ?? 'Anonymous';
  const normalizedName = (role === 'teacher') ? (rawName ? capitalize(rawName) : 'Teacher') : displayName;

  participants.set(socket.id, { id: id ?? socket.id, name: normalizedName, role: (role ?? 'student') as Role });
  broadcastParticipantList(io);
  console.log(`Participant joined: ${socket.id} (${normalizedName})`);
}

/** Handle incoming chat messages */
function handleChatSend(io: Server, socket: Socket, msg: any) {
  const text = msg?.text;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return socket.emit('chat:error', { message: 'Empty message' });
  }

  const participant = participants.get(socket.id);
  const message = buildChatMessage(participant, msg, socket.id);
  io.emit('chat:message', message);
}

/** Handle kick requests from teachers */
function handleParticipantKick(io: Server, socket: Socket, payload: KickPayload) {
  const requester = participants.get(socket.id);
  if (!isAuthorizedKick(requester, payload, socket.id)) {
    socket.emit('participant:kick:error', { message: 'Unauthorized' });
    console.log(`Unauthorized kick attempt by ${socket.id}`, { requester, payload });
    return;
  }

  const targetId = payload?.targetSocketId;
  if (!targetId) return socket.emit('participant:kick:error', { message: 'Missing target' });

  const targetSocket = io.sockets.sockets.get(targetId as string);
  console.log(`Kick requested by ${socket.id} (teacher=${requester?.name ?? 'unknown'}) for target ${targetId}`);

  if (targetSocket) {
    try {
      targetSocket.emit('participant:kicked', { reason: 'Removed by teacher' });
    } catch (e) {
      console.error('Error emitting kicked event', e);
    }
    setTimeout(() => {
      try {
        targetSocket.disconnect(true);
      } catch (e) {
        console.error('Error disconnecting socket', e);
      }
    }, 300);
  }

  participants.delete(targetId as string);
  broadcastParticipantList(io);
  socket.emit('participant:kick:success', { targetSocketId: targetId });
}

/** Handle client disconnect */
function handleDisconnect(io: Server, socket: Socket) {
  console.log(`Client disconnected: ${socket.id}`);
  participants.delete(socket.id);
  broadcastParticipantList(io);
}

/** Poll helpers (kept mostly as before) */
async function handleGetCurrentPoll(socket: Socket): Promise<void> {
  try {
    const poll = await pollService.getCurrentPoll();
    socket.emit('poll:current', poll);
  } catch (error) {
    console.error('Error fetching current poll:', error);
    socket.emit('error', { message: 'Failed to fetch current poll' });
  }
}

async function handlePollCreate(io: Server, data: any): Promise<void> {
  try {
    const { question, options, duration } = data;
    const poll = await pollService.createPoll(question, options, duration);

    io.emit('poll:new', poll);

    const timer = setTimeout(async () => {
      const endedPoll = await pollService.endPoll(poll.id);
      io.emit('poll:ended', endedPoll);
      pollTimers.delete(poll.id);
    }, duration * 1000);

    pollTimers.set(poll.id, timer);
  } catch (error) {
    console.error('Error creating poll:', error);
  }
}

async function handleVote(io: Server, socket: Socket, data: any): Promise<void> {
  try {
    const { pollId, studentId, optionId } = data;
    const result = await pollService.submitVote(pollId, studentId, optionId);

    if (result.success && result.poll) {
      io.emit('poll:update', result.poll);
      socket.emit('vote:success', { message: result.message });
    } else {
      socket.emit('vote:error', { message: result.message });
    }
  } catch (error) {
    console.error('Error handling vote:', error);
    socket.emit('vote:error', { message: 'Failed to submit vote' });
  }
}

/**
 * Restore timers for active polls on server startup.
 * Scans for the current active poll and re-creates the in-memory timer
 * so polls will end at the expected time after a restart.
 */
export async function restoreActivePollTimers(io: Server): Promise<void> {
  try {
    const poll = await pollService.getCurrentPoll();
    if (!poll || !poll.isActive) return;

    const now = Date.now();
    const endAt = (poll.startTime ?? 0) + (poll.duration ?? 0) * 1000;
    const remaining = Math.max(0, Math.floor((endAt - now) / 1000));

    if (remaining <= 0) {
      // already expired — end immediately
      try {
        const ended = await pollService.endPoll(poll.id);
        io.emit('poll:ended', ended);
      } catch (err) {
        console.error('Error ending expired poll during restore:', err);
      }
      return;
    }

    // schedule timer to end poll after remaining seconds
    const timer = setTimeout(async () => {
      try {
        const ended = await pollService.endPoll(poll.id);
        io.emit('poll:ended', ended);
        pollTimers.delete(poll.id);
      } catch (err) {
        console.error('Error ending poll from restore timer:', err);
      }
    }, remaining * 1000);

    pollTimers.set(poll.id, timer);
    console.log(`Restored poll timer for ${poll.id}, remaining ${remaining}s`);
  } catch (error) {
    console.error('Failed to restore active poll timers:', error);
  }
}

/**
 * Return a lightweight list of connected participants.
 * Used by controllers to check participant vote status.
 */
export function getParticipantList(): Array<{ id: string; name: string; role: string; socketId: string }> {
  return Array.from(participants.entries()).map(([socketId, p]) => ({ socketId, id: p.id, name: p.name, role: p.role }));
}