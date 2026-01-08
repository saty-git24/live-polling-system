import { Request, Response } from 'express';
import { pollService } from '../services/pollService';
import { getIo } from '../sockets/socketServer';
import { getParticipantList } from '../sockets/pollSocket';
import { isDbConnected } from '../config/database';

export class PollController {
  // End the given poll (HTTP). Emits `poll:ended` via sockets.
  async endPoll(req: Request, res: Response): Promise<void> {
    try {
      const { pollId } = req.body;
      if (!pollId) {
        res.status(400).json({ error: 'Missing pollId' });
        return;
      }

      const endedPoll = await pollService.endPoll(pollId);

      // emit via sockets so all clients get update
      try {
        const io = getIo();
        if (io) io.emit('poll:ended', endedPoll);
      } catch (err) {
        console.warn('Could not emit poll:ended via socket:', (err as any)?.message ?? err);
      }

      res.json({ success: true, poll: endedPoll });
    } catch (error) {
      console.error('Error in endPoll:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Debug endpoint to inspect in-memory poll state when DB is down
  async debugPoll(req: Request, res: Response): Promise<void> {
    try {
      const inMemory = pollService.getInMemoryState();
      res.json({ isDbConnected: isDbConnected(), inMemory });
    } catch (error) {
      console.error('Error in debugPoll:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  async createPoll(req: Request, res: Response): Promise<void> {
    try {
      const { question, options, duration } = req.body;

      if (!question || !options || !duration) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (options.length < 2 || options.length > 10) {
        res.status(400).json({ error: 'Options must be between 2 and 10' });
        return;
      }

      if (duration < 5 || duration > 60) {
        res.status(400).json({ error: 'Duration must be between 5 and 60 seconds' });
        return;
      }

      // Enforce: can only ask a new question if no active poll OR all students have answered
      const current = await pollService.getCurrentPoll();
      if (current && current.isActive) {
        // get connected participants and check students
        const participants = getParticipantList();
        const studentParticipants = participants.filter(p => p.role === 'student');
        // If there are students connected, ensure all have voted for the current poll
        if (studentParticipants.length > 0) {
          for (const p of studentParticipants) {
            const voted = await pollService.hasVoted(current.id, p.id);
            if (!voted) {
              res.status(400).json({ error: 'Cannot create new poll: some students have not answered the current poll' });
              return;
            }
          }
        }
      }

      const poll = await pollService.createPoll(question, options, duration);
      // Emit poll:new for HTTP-created polls so socket-connected clients receive it.
      try {
        const io = getIo();
        if (io) io.emit('poll:new', poll);
      } catch (err) {
        console.warn('Could not emit poll:new via socket:', (err as any)?.message ?? err);
      }
      res.status(201).json(poll);
    } catch (error) {
      console.error('Error in createPoll:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCurrentPoll(req: Request, res: Response): Promise<void> {
    try {
      const poll = await pollService.getCurrentPoll();
      res.json({ poll });
    } catch (error) {
      console.error('Error in getCurrentPoll:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async submitVote(req: Request, res: Response): Promise<void> {
    try {
      const { pollId, studentId, optionId } = req.body;

      // Debug: log incoming vote payload
      console.log('DEBUG: submitVote payload:', { pollId, studentId, optionId });

      if (!pollId || !studentId || !optionId) {
        console.warn('submitVote validation failed - missing fields', { pollId, studentId, optionId });
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await pollService.submitVote(pollId, studentId, optionId);

      // Debug: log service result
      console.log('DEBUG: pollService.submitVote result:', result);

      if (result.success) {
        // Broadcast live update to sockets when an HTTP vote is submitted
        try {
          const io = getIo();
          if (io && result.poll) io.emit('poll:update', result.poll);
        } catch (err) {
          console.warn('Could not emit poll:update via socket:', (err as any)?.message ?? err);
        }

        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in submitVote:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async checkVoteStatus(req: Request, res: Response): Promise<void> {
    try {
      const { pollId, studentId } = req.query;

      if (!pollId || !studentId) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const hasVoted = await pollService.hasVoted(
        pollId as string,
        studentId as string
      );
      const selectedOption = hasVoted
        ? await pollService.getVote(pollId as string, studentId as string)
        : null;

      res.json({ hasVoted, selectedOption });
    } catch (error) {
      console.error('Error in checkVoteStatus:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPollHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await pollService.getPollHistory();
      res.json({ history });
    } catch (error) {
      console.error('Error in getPollHistory:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}