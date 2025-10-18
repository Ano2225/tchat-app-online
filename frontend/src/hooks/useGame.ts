import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';

interface UseGameProps {
  channel: string;
  socket?: Socket | null;
}

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
    if (!socket || !user) return;

    // Rejoindre le canal de jeu seulement si c'est le canal Game
    if (isGameChannel) {
      console.log('Joining game channel:', channel);
      socket.emit('join_game_channel', channel);
    } else {
      // Si ce n'est pas le canal Game, réinitialiser l'état
      resetGame();
      return;
    }

    // Écouter les événements de jeu
    const handleGameState = (state: any) => {
      console.log('Game state received:', state);
      setGameState(state);
    };

    const handleGameStarted = () => {
      console.log('Jeu démarré!');
    };

    const handleNewQuestion = (question: any) => {
      console.log('New question received:', question);
      setQuestion(question);
      if (question.duration) {
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
      }
      if (socket && isGameChannel) {
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