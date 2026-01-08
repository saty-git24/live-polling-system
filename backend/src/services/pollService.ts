import { getDB, isDbConnected } from '../config/database';
import { Poll, Vote, PollOption } from '../models/Poll';

export class PollService {
  private inMemoryPoll: Poll | null = null;
  // track votes for the in-memory poll: studentId -> optionId
  private inMemoryVotes: Record<string, string> = {};
  // store ended polls in memory when DB is not available
  private inMemoryHistory: Poll[] = [];
  async createPoll(
    question: string,
    options: string[],
    duration: number
  ): Promise<Poll> {
    const db = getDB();
    const pollId = `poll-${Date.now()}`;
    const startTime = Date.now();
    
    const pollOptions: PollOption[] = options.map((text, idx) => ({
      id: `opt-${idx}`,
      text,
      votes: 0
    }));

    const poll: Poll = {
      id: pollId,
      question,
      options: pollOptions,
      startTime,
      duration,
      isActive: true,
      totalVotes: 0
    };

    // If DB is not connected, keep the poll in memory so the app can function in dev.
    if (!isDbConnected()) {
      this.inMemoryPoll = poll;
      this.inMemoryVotes = {};
      console.warn('Warning: database not connected — storing poll in memory for dev');
      console.log(`In-memory poll created: ${pollId}`);
      return poll;
    }

    try {
      await db.query(
        `INSERT INTO polls (id, question, options, start_time, duration, is_active, total_votes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [pollId, question, JSON.stringify(pollOptions), startTime, duration, true, 0]
      );

      return poll;
    } catch (error) {
      console.warn('Warning: failed to persist poll to DB, continuing without DB:', (error as any)?.message ?? error);
      // Fall back to in-memory storage if DB insert fails for any reason.
      this.inMemoryPoll = poll;
      this.inMemoryVotes = {};
      return poll;
    }
  }

  async getCurrentPoll(): Promise<Poll | null> {
    const db = getDB();
    
    try {
      const result = await db.query(
        `SELECT * FROM polls WHERE is_active = true ORDER BY created_at DESC LIMIT 1`
      );

      if (result.rows.length === 0) {
        // If DB returned nothing, fall back to an in-memory poll if available.
        return this.inMemoryPoll;
      }

      return this.mapRowToPoll(result.rows[0]);
    } catch (error) {
      console.error('Error fetching current poll:', error);
      return this.inMemoryPoll;
    }
  }

  async getPollById(pollId: string): Promise<Poll | null> {
    const db = getDB();
    
    try {
      const result = await db.query(
        `SELECT * FROM polls WHERE id = $1`,
        [pollId]
      );

      if (result.rows.length === 0) {
        // fall back to in-memory poll if present
        if (this.inMemoryPoll && this.inMemoryPoll.id === pollId) return this.inMemoryPoll;
        return null;
      }

      return this.mapRowToPoll(result.rows[0]);
    } catch (error) {
      console.error('Error fetching poll:', error);
      // If DB is unavailable, check in-memory poll
      if (this.inMemoryPoll && this.inMemoryPoll.id === pollId) return this.inMemoryPoll;
      return null;
    }
  }

  async submitVote(
    pollId: string,
    studentId: string,
    optionId: string
  ): Promise<{ success: boolean; message: string; poll?: Poll }> {
    const db = getDB();

    // If DB is not connected, handle vote in memory for the active in-memory poll.
    if (!isDbConnected()) {
      if (!this.inMemoryPoll || this.inMemoryPoll.id !== pollId) {
        return { success: false, message: 'Poll not found' };
      }

      if (!this.inMemoryPoll.isActive) {
        return { success: false, message: 'Poll is no longer active' };
      }

      if (this.inMemoryVotes[studentId]) {
        return { success: false, message: 'You have already voted' };
      }

      const option = this.inMemoryPoll.options.find(o => o.id === optionId);
      if (!option) {
        return { success: false, message: 'Option not found' };
      }

      option.votes += 1;
      this.inMemoryPoll.totalVotes += 1;
      this.inMemoryVotes[studentId] = optionId;

      return { success: true, message: 'Vote recorded', poll: this.inMemoryPoll };
    }

    try {
      const poll = await this.getPollById(pollId);
      if (!poll) {
        return { success: false, message: 'Poll not found' };
      }

      if (!poll.isActive) {
        return { success: false, message: 'Poll is no longer active' };
      }

      const existingVote = await db.query(
        `SELECT * FROM votes WHERE poll_id = $1 AND student_id = $2`,
        [pollId, studentId]
      );

      if (existingVote.rows.length > 0) {
        return { success: false, message: 'You have already voted' };
      }

      await db.query(
        `INSERT INTO votes (poll_id, student_id, selected_option, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [pollId, studentId, optionId, Date.now()]
      );

      const updatedOptions = poll.options.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, votes: opt.votes + 1 };
        }
        return opt;
      });

      await db.query(
        `UPDATE polls SET options = $1, total_votes = total_votes + 1 WHERE id = $2`,
        [JSON.stringify(updatedOptions), pollId]
      );

      const updatedPoll = await this.getPollById(pollId);

      return { success: true, message: 'Vote recorded', poll: updatedPoll! };
    } catch (error) {
      console.error('Error submitting vote:', error);
      return { success: false, message: 'Failed to submit vote' };
    }
  }

  async hasVoted(pollId: string, studentId: string): Promise<boolean> {
    const db = getDB();

    if (!isDbConnected()) {
      return !!this.inMemoryVotes[studentId];
    }

    try {
      const result = await db.query(
        `SELECT * FROM votes WHERE poll_id = $1 AND student_id = $2`,
        [pollId, studentId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking vote status:', error);
      return false;
    }
  }

  async getVote(pollId: string, studentId: string): Promise<string | null> {
    const db = getDB();

    if (!isDbConnected()) {
      return this.inMemoryVotes[studentId] || null;
    }

    try {
      const result = await db.query(
        `SELECT selected_option FROM votes WHERE poll_id = $1 AND student_id = $2`,
        [pollId, studentId]
      );

      return result.rows.length > 0 ? result.rows[0].selected_option : null;
    } catch (error) {
      console.error('Error fetching vote:', error);
      return null;
    }
  }

  async endPoll(pollId: string): Promise<Poll | null> {
    const db = getDB();

    try {
      await db.query(
        `UPDATE polls SET is_active = false WHERE id = $1`,
        [pollId]
      );
      // If DB is connected, return the ended poll from the database.
      try {
        const ended = await this.getPollById(pollId);
        return ended;
      } catch (err) {
        return null;
      }
    } catch (error) {
      console.error('Error ending poll:', error);
    }

    // If DB isn't available or update failed, mark in-memory poll as ended and push to history
    if (this.inMemoryPoll && this.inMemoryPoll.id === pollId) {
      // mark ended poll
      this.inMemoryPoll.isActive = false;
      // capture a copy to store in history
      const ended = this.inMemoryPoll;
      this.inMemoryHistory.unshift(ended);
      console.log(`In-memory poll ended and moved to history: ${pollId}`);
      // clear current poll so a new poll can be created
      this.inMemoryPoll = null;
      this.inMemoryVotes = {};
      return ended;
    }

    return null;
  }

  async getPollHistory(): Promise<Poll[]> {
    const db = getDB();

    try {
      const result = await db.query(
        `SELECT * FROM polls WHERE is_active = false ORDER BY created_at DESC LIMIT 50`
      );

      return result.rows.map(row => this.mapRowToPoll(row));
    } catch (error) {
      console.error('Error fetching poll history:', error);
      // Return in-memory history when DB isn't available
      return this.inMemoryHistory;
    }
  }

  // Expose in-memory state for debugging when DB is unavailable
  getInMemoryState() {
    return {
      current: this.inMemoryPoll,
      votes: this.inMemoryVotes,
      history: this.inMemoryHistory,
    };
  }

  private mapRowToPoll(row: any): Poll {
    return {
      id: row.id,
      question: row.question,
      options: row.options,
      startTime: parseInt(row.start_time),
      duration: row.duration,
      isActive: row.is_active,
      totalVotes: row.total_votes
    };
  }
}

// Export a singleton instance so different parts of the app share in-memory state.
export const pollService = new PollService();