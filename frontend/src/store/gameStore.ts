import { create } from 'zustand';

interface Player {
  userId: string;
  username: string;
  score: number;
}

interface Question {
  question: string;
  options: string[];
  duration: number;
  explanation?: string;
}

interface GameState {
  isActive: boolean;
  currentQuestion: Question | null;
  leaderboard: Player[];
  timeLeft: number;
  hasAnswered: boolean;
  lastAnswer: { isCorrect: boolean; points: number; correctAnswer: number; isWinner?: boolean } | null;
  winner: string | null;
  explanation: string | null;
  error: string | null;
  
  setGameState: (state: { isActive: boolean; currentQuestion?: any; leaderboard: Player[] }) => void;
  setQuestion: (question: Question) => void;
  setTimeLeft: (time: number) => void;
  setHasAnswered: (answered: boolean) => void;
  setAnswerResult: (result: { isCorrect: boolean; points: number; correctAnswer: number; isWinner?: boolean } | null) => void;
  setWinner: (winner: string | null) => void;
  setExplanation: (explanation: string | null) => void;
  updateLeaderboard: (leaderboard: Player[]) => void;
  resetGame: () => void;
  setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  isActive: false,
  currentQuestion: null,
  leaderboard: [],
  timeLeft: 0,
  hasAnswered: false,
  lastAnswer: null,
  winner: null,
  explanation: null,
  error: null,

  setGameState: (state) => set({
    isActive: state.isActive,
    leaderboard: state.leaderboard || [],
    currentQuestion: state.currentQuestion ? {
      question: state.currentQuestion.question,
      options: [],
      duration: 15000,
      explanation: state.currentQuestion.explanation
    } : null,
    timeLeft: state.currentQuestion?.startTime ? 
      Math.max(0, Math.floor((15000 - (Date.now() - new Date(state.currentQuestion.startTime).getTime())) / 1000)) : 0
  }),

  setQuestion: (question) => set({
    currentQuestion: question,
    timeLeft: question.duration / 1000,
    hasAnswered: false,
    lastAnswer: null
  }),

  setTimeLeft: (time) => set({ timeLeft: time }),

  setHasAnswered: (answered) => set({ hasAnswered: answered }),

  setAnswerResult: (result) => set({ lastAnswer: result }),

  setWinner: (winner) => set({ winner }),

  setExplanation: (explanation) => set({ explanation }),

  updateLeaderboard: (leaderboard) => set({ leaderboard }),

  resetGame: () => set({
    isActive: false,
    currentQuestion: null,
    leaderboard: [],
    timeLeft: 0,
    hasAnswered: false,
    lastAnswer: null,
    winner: null,
    explanation: null,
    error: null
  }),

  setError: (error) => set({ error })
}));