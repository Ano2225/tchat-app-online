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

    socket.emit('join_game_channel', channel);

    const handleGameState = (state: any) => {
      if (isGameChannel) {
        setGameState(state);
      }
    };

    const handleNewQuestion = (question: any) => {
      if (isGameChannel && question.duration) {
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
    };

    const handleQuestionEnded = (data: any) => {
      updateLeaderboard(data.leaderboard);
      setExplanation(data.explanation);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setTimeout(() => {
        setHasAnswered(false);
        setAnswerResult(null);
        setWinner(null);
        setExplanation(null);
      }, 4000);
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let time = Math.floor(duration);
    setTimeLeft(time);

    timerRef.current = setInterval(() => {
      time -= 1;
      if (time <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
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
    submitAnswer
  };
};