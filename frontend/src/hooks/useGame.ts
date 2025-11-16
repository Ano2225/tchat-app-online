import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';

export const useGame = (channel: string, socket?: Socket | null) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const user = useAuthStore((state) => state.user);
  const isGameChannel = channel === 'Game';
  
  const {
    isActive,
    currentQuestion,
    leaderboard,
    timeLeft,
    hasAnswered,
    lastAnswer,
    winner,
    explanation,
    isLoading,
    setGameState,
    setQuestion,
    setTimeLeft,
    setHasAnswered,
    setAnswerResult,
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
    socket.emit('join_game_channel', channel);

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
          
          // Handle timer for current question
          if (state.currentQuestion && state.currentQuestion.startTime) {
            const elapsed = Date.now() - new Date(state.currentQuestion.startTime).getTime();
            const remaining = Math.max(0, Math.floor((15000 - elapsed) / 1000));
            console.log('[GAME] Question in progress, remaining time:', remaining);
            if (remaining > 0) {
              startTimer(remaining);
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
        startTimer(Math.floor(question.duration / 1000));
      }
    };

    const handleAnswerResult = (result: any) => {
      try {
        if (result && result.userId === user.id) {
          if (!result.alreadyAnswered) {
            setAnswerResult(result);
            setHasAnswered(true);
          }
        }
      } catch (error) {
        console.error('[GAME] Error handling answer result:', error);
      }
    };

    const handleWinnerAnnounced = (data: any) => {
      console.log('[GAME] Winner announced:', data);
      setWinner(data.winner);
      setExplanation(data.correctAnswer ? `Réponse correcte: ${data.correctAnswer}` : null);
    };

    const handleQuestionEnded = (data: any) => {
      console.log('[GAME] Question ended:', data);
      updateLeaderboard(data.leaderboard);
      setExplanation(data.explanation);
      setTimeLeft(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Show loading state for next question
      setTimeout(() => {
        setLoading(true);
      }, 5000);
      
      // Clear question after showing explanation
      setTimeout(() => {
        setHasAnswered(false);
        setAnswerResult(null);
        setWinner(null);
        setExplanation(null);
        setQuestion(null);
      }, 7000); // Longer delay to read explanation
    };

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
      socket.emit('leave_game_channel', channel);
      socket.off('game_state', handleGameState);
      socket.off('new_question', handleNewQuestion);
      socket.off('answer_result', handleAnswerResult);
      socket.off('winner_announced', handleWinnerAnnounced);
      socket.off('question_ended', handleQuestionEnded);
    };
  }, [socket, user?.id, isGameChannel]);

  const startTimer = (duration: number) => {
    console.log('[GAME] Starting timer with duration:', duration);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let time = Math.max(0, Math.floor(duration));
    setTimeLeft(time);
    
    if (time <= 0) {
      return;
    }

    timerRef.current = setInterval(() => {
      time -= 1;
      console.log('[GAME] Timer tick:', time);
      
      if (time <= 0) {
        console.log('[GAME] Timer finished');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTimeLeft(0);
      } else {
        setTimeLeft(time);
      }
    }, 1000);
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
    winner: isGameChannel ? winner : null,
    explanation: isGameChannel ? explanation : null,
    isLoading: isGameChannel ? isLoading : false,
    submitAnswer
  };
};