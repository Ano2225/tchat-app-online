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
    setGameState,
    setQuestion,
    setTimeLeft,
    setHasAnswered,
    setAnswerResult,
    setWinner,
    setExplanation,
    updateLeaderboard,
    resetGame
  } = useGameStore();

  useEffect(() => {
    if (!socket || !user || !isGameChannel) {
      if (!isGameChannel) {
        resetGame();
      }
      return;
    }

    console.log('Joining game channel:', channel);
    socket.emit('join_game_channel', channel);

    // Écouter les événements de jeu
    const handleGameState = (state: any) => {
      console.log('[FRONTEND] Game state received:', state);
      console.log('[FRONTEND] Current question details:', state.currentQuestion);
      console.log('[FRONTEND] Channel:', channel, 'isGameChannel:', isGameChannel);
      if (isGameChannel) {
        setGameState(state);
        console.log('[FRONTEND] After setGameState - currentQuestion:', currentQuestion);
      }
    };

    const handleGameStarted = () => {
      console.log('Jeu démarré!');
    };

    const handleNewQuestion = (question: any) => {
      console.log('[FRONTEND] New question received:', question);
      if (isGameChannel && question.duration) {
        console.log('[FRONTEND] Starting timer for:', question.duration / 1000, 'seconds');
        // Update the question in the store
        setQuestion({
          question: question.question,
          options: question.options || [],
          duration: question.duration,
          explanation: question.explanation
        });
        startTimer(question.duration / 1000);
      }
    };

    const handleAnswerResult = (result: any) => {
      if (!result.alreadyAnswered) {
        setAnswerResult(result);
        setHasAnswered(true);
      }
    };

    const handleWinnerAnnounced = (data: any) => {
      setWinner(data.winner);
      console.log(`🎉 ${data.winner} a gagné ${data.points} points !`);
    };

    const handleQuestionEnded = (data: any) => {
      updateLeaderboard(data.leaderboard);
      setExplanation(data.explanation);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Réinitialiser pour la prochaine question
      setTimeout(() => {
        setHasAnswered(false);
        setAnswerResult(null);
        setWinner(null);
        setExplanation(null);
      }, 4000);
    };

    socket.on('game_state', handleGameState);
    socket.on('game_started', handleGameStarted);
    socket.on('new_question', handleNewQuestion);
    socket.on('answer_result', handleAnswerResult);
    socket.on('winner_announced', handleWinnerAnnounced);
    socket.on('question_ended', handleQuestionEnded);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (socket) {
        socket.emit('leave_game_channel', channel);
        socket.off('game_state', handleGameState);
        socket.off('game_started', handleGameStarted);
        socket.off('new_question', handleNewQuestion);
        socket.off('answer_result', handleAnswerResult);
        socket.off('winner_announced', handleWinnerAnnounced);
        socket.off('question_ended', handleQuestionEnded);
      }
    };
  }, [channel, socket, user, isGameChannel]);

  const startTimer = (duration: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let time = Math.floor(duration);
    setTimeLeft(time);

    timerRef.current = setInterval(() => {
      time -= 1;
      setTimeLeft(Math.max(0, time));
      
      if (time <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
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
    submitAnswer
  };
};