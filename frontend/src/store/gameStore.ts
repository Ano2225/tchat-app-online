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
  category?: string;
  categoryEmoji?: string;
  difficulty?: string;
  source?: string;
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
  isLoading: boolean;
  
  setGameState: (state: { isActive: boolean; currentQuestion?: any; leaderboard: Player[] }) => void;
  setQuestion: (question: Question | null) => void;
  setTimeLeft: (time: number) => void;
  setHasAnswered: (answered: boolean) => void;
  setAnswerResult: (result: { isCorrect: boolean; points: number; correctAnswer: number; isWinner?: boolean } | null) => void;
  setWinner: (winner: string | null) => void;
  setExplanation: (explanation: string | null) => void;
  updateLeaderboard: (leaderboard: Player[]) => void;
  resetGame: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
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
  isLoading: false,

  setGameState: (state) => {
    try {
      const gameState: any = {
        isActive: state.isActive,
        leaderboard: state.leaderboard || [],
        hasAnswered: false,
        winner: null,
        explanation: null
      };
      
      if (state.currentQuestion) {
        gameState.currentQuestion = {
          question: state.currentQuestion.question || 'Question non disponible',
          options: state.currentQuestion.options || [],
          duration: 15000,
          explanation: state.currentQuestion.explanation || '',
          category: state.currentQuestion.category || 'Quiz',
          categoryEmoji: state.currentQuestion.categoryEmoji || '❓',
          difficulty: state.currentQuestion.difficulty || 'Moyen',
          source: state.currentQuestion.source || 'Local'
        };
        
        console.log('[STORE] Setting question with options:', gameState.currentQuestion.options);
        
        // Calculer le temps restant si la question a un startTime
        if (state.currentQuestion.startTime) {
          const elapsed = Date.now() - new Date(state.currentQuestion.startTime).getTime();
          const remaining = Math.max(0, Math.floor((15000 - elapsed) / 1000));
          console.log('[STORE] StartTime:', state.currentQuestion.startTime, 'Elapsed:', elapsed, 'Remaining:', remaining);
          
          // Si le temps est écoulé, ne pas afficher la question
          if (remaining <= 0) {
            gameState.currentQuestion = null;
            gameState.timeLeft = 0;
          } else {
            gameState.timeLeft = remaining;
          }
        } else {
          // Pas de startTime, démarrer avec 15 secondes
          gameState.timeLeft = 15;
        }
      } else {
        gameState.currentQuestion = null;
        gameState.timeLeft = 0;
      }
      
      set(gameState);
    } catch (error) {
      console.error('Error setting game state:', error);
      set({ error: 'Failed to update game state' });
    }
  },

  setQuestion: (question) => {
    try {
      console.log('[STORE] Setting new question:', question);
      
      if (!question) {
        set({
          currentQuestion: null,
          timeLeft: 0,
          hasAnswered: false,
          lastAnswer: null,
          winner: null,
          explanation: null
        });
        return;
      }
      
      set({
        currentQuestion: {
          question: question.question || 'Question non disponible',
          options: question.options || [],
          duration: question.duration || 15000,
          explanation: question.explanation || '',
          category: question.category || 'Quiz',
          categoryEmoji: question.categoryEmoji || '❓',
          difficulty: question.difficulty || 'Moyen',
          source: question.source || 'Local'
        },
        timeLeft: Math.floor(question.duration / 1000),
        hasAnswered: false,
        lastAnswer: null,
        winner: null,
        explanation: null
      });
    } catch (error) {
      console.error('Error setting question:', error);
      set({ error: 'Failed to set question' });
    }
  },

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
    error: null,
    isLoading: false
  }),

  setError: (error) => set({ error }),
  
  setLoading: (loading) => set({ isLoading: loading })
}));