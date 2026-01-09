import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useToast } from './ToastContext';
import { apiService } from '../services/api';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  startTime: number;
  duration: number;
  isActive: boolean;
  totalVotes: number;
}

interface PollState {
  currentPoll: Poll | null;
  pollHistory: Poll[];
  loading: boolean;
  error: string | null;
  participants: Array<{ socketId: string; id: string; name: string; role: string }>;
}

type PollAction =
  | { type: 'SET_CURRENT_POLL'; payload: Poll | null }
  | { type: 'SET_POLL_HISTORY'; payload: Poll[] }
  | { type: 'UPDATE_POLL'; payload: Poll }
  | { type: 'END_POLL'; payload: Poll }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PARTICIPANTS'; payload: Array<{ socketId: string; id: string; name: string; role: string }> };

const initialState: PollState = {
  currentPoll: null,
  pollHistory: [],
  loading: false,
  error: null,
  participants: [],
};

function pollReducer(state: PollState, action: PollAction): PollState {
  switch (action.type) {
    case 'SET_CURRENT_POLL':
      return { ...state, currentPoll: action.payload, loading: false };
    case 'SET_POLL_HISTORY':
      return { ...state, pollHistory: action.payload };
    case 'SET_PARTICIPANTS':
      return { ...state, participants: action.payload };
    case 'UPDATE_POLL':
      return { ...state, currentPoll: action.payload };
    case 'END_POLL':
      return {
        ...state,
        currentPoll: null,
        pollHistory: action.payload ? [action.payload, ...state.pollHistory] : state.pollHistory,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

interface PollContextType extends PollState {
  createPoll: (question: string, options: string[], duration: number) => Promise<void>;
  submitVote: (pollId: string, studentId: string, optionId: string) => Promise<boolean>;
  endPoll: (pollId: string) => Promise<void>;
  refreshCurrentPoll: () => Promise<void>;
}

const PollContext = createContext<PollContextType | undefined>(undefined);

export function PollProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pollReducer, initialState);
  const { socket } = useSocket();
  const { addToast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // ask for the current participant list once when the socket is available
    try {
      socket.emit('participant:list:request');
    } catch (e) {
      // ignore
    }

    socket.on('poll:new', (poll: Poll) => {
      dispatch({ type: 'SET_CURRENT_POLL', payload: poll });
    });

    socket.on('poll:update', (poll: Poll) => {
      dispatch({ type: 'UPDATE_POLL', payload: poll });
    });

    socket.on('poll:ended', (poll: Poll) => {
      dispatch({ type: 'END_POLL', payload: poll });
    });

    socket.on('poll:current', (poll: Poll | null) => {
      dispatch({ type: 'SET_CURRENT_POLL', payload: poll });
    });

    // keep track of connected participants so UI can react (e.g., enable Ask Another Question)
    socket.on('participant:list', (list: Array<{ socketId: string; id: string; name: string; role: string }>) => {
      dispatch({ type: 'SET_PARTICIPANTS', payload: Array.isArray(list) ? list : [] });
    });

    return () => {
      socket.off('poll:new');
      socket.off('poll:update');
      socket.off('poll:ended');
      socket.off('poll:current');
      socket.off('participant:list');
    };
  }, [socket]);

  async function loadInitialData() {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [currentPoll, history] = await Promise.all([
        apiService.getCurrentPoll(),
        apiService.getPollHistory(),
      ]);
      // sanitize responses: ensure we always set arrays and filter out null/invalid entries
      const safeHistory = Array.isArray(history) ? history.filter((p) => p && p.id) : [];
      const safeCurrent = currentPoll || null;

      dispatch({ type: 'SET_CURRENT_POLL', payload: safeCurrent });
      dispatch({ type: 'SET_POLL_HISTORY', payload: safeHistory });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
      // Don't show toast for initial data load failures - fails silently if server is not ready
      // Only show toasts for user-initiated actions (create, vote, end poll)
    }
  }

  async function createPoll(question: string, options: string[], duration: number) {
    try {
      const data = await apiService.createPoll(question, options, duration);
      // API may return the poll object directly or wrapped. Normalize both shapes.
      const createdPoll = data && data.poll ? data.poll : data;
      if (createdPoll) {
        dispatch({ type: 'SET_CURRENT_POLL', payload: createdPoll });
        addToast({ type: 'success', message: 'Poll created' });
      }
      // emit socket event to notify other clients (server may also broadcast)
      socket?.emit('poll:create', { question, options, duration });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create poll' });
      addToast({ type: 'error', message: 'Failed to create poll' });
      throw error;
    }
  }

  async function endPoll(pollId: string) {
    try {
      await apiService.endPoll(pollId);
      // server will emit poll:ended; we rely on socket to update state
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to end poll' });
      addToast({ type: 'error', message: 'Failed to end poll' });
    }
  }

  async function submitVote(pollId: string, studentId: string, optionId: string): Promise<boolean> {
    // Optimistic UI: update local poll immediately, revert on error
    const current = (state.currentPoll && state.currentPoll.id === pollId) ? state.currentPoll : null;
    if (!current) return false;

    // deep clone current poll
    const prev = JSON.parse(JSON.stringify(current)) as typeof current;
    const optimistic = JSON.parse(JSON.stringify(current)) as typeof current;

    const option = optimistic.options.find((o) => o.id === optionId);
    if (!option) return false;

    option.votes = (option.votes ?? 0) + 1;
    optimistic.totalVotes = (optimistic.totalVotes ?? 0) + 1;

    dispatch({ type: 'UPDATE_POLL', payload: optimistic });

    try {
      await apiService.submitVote(pollId, studentId, optionId);
      addToast({ type: 'success', message: 'Vote recorded' });
      // server will broadcast authoritative update via socket; keep optimistic state until socket arrives
      return true;
    } catch (error) {
      // revert optimistic update
      dispatch({ type: 'UPDATE_POLL', payload: prev });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to submit vote' });
      addToast({ type: 'error', message: 'Failed to submit vote' });
      return false;
    }
  }

  async function refreshCurrentPoll() {
    try {
      const poll = await apiService.getCurrentPoll();
      dispatch({ type: 'SET_CURRENT_POLL', payload: poll });
    } catch (error) {
      console.error('Failed to refresh poll:', error);
    }
  }

  return (
    <PollContext.Provider
      value={{
        ...state,
        createPoll,
        submitVote,
        endPoll,
        refreshCurrentPoll,
        participants: state.participants,
      }}
    >
      {children}
    </PollContext.Provider>
  );
}

export function usePollContext() {
  const context = useContext(PollContext);
  if (!context) {
    throw new Error('usePollContext must be used within PollProvider');
  }
  return context;
}