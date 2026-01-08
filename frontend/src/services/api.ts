import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getCurrentPoll() {
    const response = await this.client.get('/polls/current');
    return response.data.poll;
  }

  async createPoll(question: string, options: string[], duration: number) {
    const response = await this.client.post('/polls', {
      question,
      options,
      duration,
    });
    return response.data;
  }

  async submitVote(pollId: string, studentId: string, optionId: string) {
    const response = await this.client.post('/polls/vote', {
      pollId,
      studentId,
      optionId,
    });
    return response.data;
  }

  async checkVoteStatus(pollId: string, studentId: string) {
    const response = await this.client.get('/polls/vote-status', {
      params: { pollId, studentId },
    });
    return response.data;
  }

  async endPoll(pollId: string) {
    const response = await this.client.post('/polls/end', { pollId });
    return response.data;
  }

  async getPollHistory() {
    const response = await this.client.get('/polls/history');
    return response.data.history;
  }
}

export const apiService = new ApiService();