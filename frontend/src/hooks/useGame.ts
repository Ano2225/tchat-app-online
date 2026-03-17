import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';

export const useGame = (channel: string, socket?: Socket | null) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const joinedRef = useRef<boolean>(false);
  const user = useAuthStore((state) => state.user);
  const isGameChannel = channel === 'Game';
  
  const {
    isActive,
    currentQuestion,
    leaderboard,
    timeLeft,
    hasAnswered,
    lastAnswer,
    correctAnswer,
    winner,
    explanation,
    isLoading,
    setGameState,
    setQuestion,
    setTimeLeft,
    setHasAnswered,
    setAnswerResult,
    setCorrectAnswer,
    setWinner,
    setExplanation,
    updateLeaderboard,
    resetGame,
    setLoading
  } = useGameStore();

  useEffect(() => {
    if (!socket || !user || !isGameChannel) {
      if (!isGameChannel) {
        resetGame();
      }
      return;
    }

    // Reset game state when entering channel
    resetGame();
    
    // Éviter les appels multiples
    if (!joinedRef.current) {
      joinedRef.current = true;
      socket.emit('join_game_channel', channel);
    }

    const handleGameState = (state: any) => {
      try {
        console.log('[GAME] Game state received:', state);
        if (isGameChannel && state) {
          setGameState(state);

          // Check if user already answered current question
          const userAnswered = state.currentQuestion?.answers?.some((a: any) => a.userId === user.id);
          if (userAnswered) {
            setHasAnswered(true);
          }

          // Handle timer using server startTime as source of truth
          if (state.currentQuestion?.startTime) {
            const elapsed = Date.now() - new Date(state.currentQuestion.startTime).getTime();
            const remaining = Math.max(0, 15000 - elapsed);
            console.log('[GAME] Question in progress, remaining ms:', remaining);
            if (remaining > 0) {
              startTimer(state.currentQuestion.startTime, 15000);
            } else {
              console.log('[GAME] Question expired');
              setTimeLeft(0);
            }
          }
        }
      } catch (error) {
        console.error('[GAME] Error handling game state:', error);
      }
    };

    const handleNewQuestion = (question: any) => {
      console.log('[GAME] New question received:', question);
      if (isGameChannel && question.duration) {
        // Clear previous state and loading
        setLoading(false);
        setHasAnswered(false);
        setAnswerResult(null);
        setWinner(null);
        setExplanation(null);

        const questionData = {
          question: question.question || 'Question non disponible',
          options: question.options || [],
          duration: question.duration || 15000,
          explanation: question.explanation || '',
          category: question.category || 'Quiz',
          categoryEmoji: question.categoryEmoji || '❓',
          difficulty: question.difficulty || 'Moyen',
          source: question.source || 'Local'
        };
        console.log('[GAME] Setting question with options:', questionData);
        setQuestion(questionData);
        // Use server startTime for authoritative timer; fall back to now
        startTimer(question.startTime ?? new Date(), question.duration || 15000);
      }
    };

    const handleAnswerResult = (result: any) => {
      try {
        if (result && result.userId === user.id) {
          if (!result.alreadyAnswered) {
            setAnswerResult({ isCorrect: result.isCorrect });
            setHasAnswered(true);
          }
        }
      } catch (error) {
        console.error('[GAME] Error handling answer result:', error);
      }
    };

    const handleWinnerAnnounced = (data: any) => {
      console.log('[GAME] Winner announced:', data);
      // Stop the frontend countdown immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeLeft(0);
      setWinner(data.winner);
      setExplanation(data.correctAnswer ? `Réponse correcte: ${data.correctAnswer}` : null);
    };

    const handleQuestionEnded = (data: any) => {
      updateLeaderboard(data.leaderboard || []);
      setCorrectAnswer(data.correctAnswer || null);
      setExplanation(data.explanation || null);
      setTimeLeft(0);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setTimeout(() => setLoading(true), 5000);

      setTimeout(() => {
        setHasAnswered(false);
        setAnswerResult(null);
        setCorrectAnswer(null);
        setWinner(null);
        setExplanation(null);
        setQuestion(null);
      }, 8000);
    };

    const handleGameStarted = () => {
      setLoading(true);
      useGameStore.setState({ isActive: true });
    };

    socket.on('game_started', handleGameStarted);
    socket.on('game_state', handleGameState);
    socket.on('new_question', handleNewQuestion);
    socket.on('answer_result', handleAnswerResult);
    socket.on('winner_announced', handleWinnerAnnounced);
    socket.on('question_ended', handleQuestionEnded);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (joinedRef.current) {
        socket.emit('leave_game_channel', channel);
        joinedRef.current = false;
      }
      socket.off('game_started', handleGameStarted);
      socket.off('game_state', handleGameState);
      socket.off('new_question', handleNewQuestion);
      socket.off('answer_result', handleAnswerResult);
      socket.off('winner_announced', handleWinnerAnnounced);
      socket.off('question_ended', handleQuestionEnded);
    };
  }, [socket, user?.id, isGameChannel]);

  // Server-authoritative timer: computes timeLeft from server startTime to avoid drift
  const startTimer = (startTime: string | Date, totalDurationMs: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const startMs = new Date(startTime).getTime();
    const compute = () => Math.max(0, Math.ceil((totalDurationMs - (Date.now() - startMs)) / 1000));

    const initial = compute();
    console.log('[GAME] Starting server-authoritative timer, initial seconds:', initial);
    setTimeLeft(initial);

    if (initial <= 0) return;

    timerRef.current = setInterval(() => {
      const remaining = compute();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
      }
    }, 300);
  };

  const submitAnswer = (answer: number) => {
    if (!hasAnswered && socket) {
      socket.emit('submit_answer', { channel, answer });
    }
  };

  return {
    isActive: isGameChannel ? isActive : false,
    currentQuestion: isGameChannel ? currentQuestion : null,
    leaderboard: isGameChannel ? leaderboard : [],
    timeLeft: isGameChannel ? timeLeft : 0,
    hasAnswered: isGameChannel ? hasAnswered : false,
    lastAnswer: isGameChannel ? lastAnswer : null,
    correctAnswer: isGameChannel ? correctAnswer : null,
    winner: isGameChannel ? winner : null,
    explanation: isGameChannel ? explanation : null,
    isLoading: isGameChannel ? isLoading : false,
    submitAnswer
  };
};