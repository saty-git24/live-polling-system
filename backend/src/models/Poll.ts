export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  startTime: number;
  duration: number;
  isActive: boolean;
  totalVotes: number;
}

export interface Vote {
  pollId: string;
  studentId: string;
  selectedOption: string;
  timestamp: number;
}