'use client';

import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface GamePanelProps {
  channel: string;
  socket?: any;
}

export default function GamePanel({ channel, socket }: GamePanelProps) {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  if (channel !== 'Game') return null;
  
  const gameData = useGame(channel, socket);
  const { isActive, currentQuestion, leaderboard, timeLeft, winner, explanation, hasAnswered, isLoading } = useGameStore();
  
  useEffect(() => {
    if (socket) {
      setConnectionStatus(socket.connected ? 'connected' : 'disconnected');
      const handleConnect = () => setConnectionStatus('connected');
      const handleDisconnect = () => setConnectionStatus('disconnected');
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      };
    }
  }, [socket]);
  
  const playerRank = leaderboard.findIndex(p => p.userId === socket?.userId) + 1;
  
  const TimeProgressBar = ({ timeLeft, maxTime = 15 }: { timeLeft: number; maxTime?: number }) => {
    const percentage = (timeLeft / maxTime) * 100;
    const getColor = () => {
      if (percentage > 60) return 'bg-green-500';
      if (percentage > 30) return 'bg-yellow-500';
      return 'bg-red-500';
    };
    
    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <motion.div
          className={`h-2 rounded-full transition-colors duration-300 ${getColor()}`}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    );
  };
  
  if (!isActive) {
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-blue-400/10 animate-pulse" />
          
          <div className="relative z-10">
            <motion.div 
              className="text-5xl mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              🧠
            </motion.div>
            
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Quiz Chat
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
              Questions du monde entier
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="text-2xl mb-1">🌍</div>
                <div className="font-semibold">Catégories variées</div>
                <div className="text-xs text-gray-500">Sciences, Histoire, Sports...</div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="text-2xl mb-1">⚡</div>
                <div className="font-semibold">Temps réel</div>
                <div className="text-xs text-gray-500">Premier = 10 points</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus === 'connected' && '🔄 Le quiz démarre automatiquement...'}
                {connectionStatus === 'connecting' && '⚠️ Connexion en cours...'}
                {connectionStatus === 'disconnected' && '❌ Connexion perdue - Rechargez la page'}
              </span>
            </div>
            
            <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full inline-block">
              💬 Tapez votre réponse dans le chat pour jouer
            </div>
          </div>
        </motion.div>
        
        <AnimatePresence>
          {leaderboard && leaderboard.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 overflow-hidden"
            >
              <div className="p-4">
                <h3 className="text-lg font-bold flex items-center mb-4">
                  <span className="text-2xl mr-2">🏆</span>
                  Classement Global
                </h3>
                
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((player, index) => (
                    <motion.div
                      key={`inactive-${player.userId || 'unknown'}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex justify-between items-center p-3 rounded-lg transition-all hover:scale-[1.02] ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-200 to-yellow-100 dark:from-yellow-800/50 dark:to-yellow-700/30 shadow-md'
                          : index === 1
                          ? 'bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/30'
                          : index === 2
                          ? 'bg-gradient-to-r from-orange-200 to-orange-100 dark:from-orange-800/50 dark:to-orange-700/30'
                          : 'bg-white/70 dark:bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                        </span>
                        <div>
                          <div className="font-semibold">{player.username}</div>
                          <div className="text-xs text-gray-500">
                            {player.score > 0 ? `${Math.floor(player.score / 10)} bonnes réponses` : 'Nouveau joueur'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{player.score || 0}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestion.question}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden shadow-lg"
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{currentQuestion.categoryEmoji || '❓'}</span>
                  <div>
                    <h3 className="font-bold text-lg">Question </h3>
                    <div className="text-xs opacity-90">
                      {currentQuestion.category && (
                        <span className="bg-white/20 px-2 py-1 rounded-full mr-2">
                          {currentQuestion.category}
                        </span>
                      )}
                      {currentQuestion.difficulty && (
                        <span className="bg-white/20 px-2 py-1 rounded-full">
                          {currentQuestion.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    timeLeft > 10 ? 'text-green-200' : 
                    timeLeft > 5 ? 'text-yellow-200' : 'text-red-200 animate-pulse'
                  }`}>
                    {timeLeft}s
                  </div>
                  <div className="text-xs opacity-75">temps restant</div>
                </div>
              </div>
              
              <TimeProgressBar timeLeft={timeLeft} />
            </div>
            
            <div className="p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <p className="text-lg font-medium leading-relaxed text-gray-800 dark:text-gray-200">
                  {currentQuestion.question}
                </p>
              </motion.div>
              
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 space-y-3"
                >
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    📝 Options de réponse :
                  </p>
                  {currentQuestion.options.map((option, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center space-x-3 p-3 bg-white/70 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800/70 transition-all"
                    >
                      <span className="font-bold text-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-sm font-medium flex-1">{option}</span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    ⚠️ Erreur de chargement des options - Vérifiez votre connexion
                  </p>
                </div>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className={`p-4 rounded-lg border-2 border-dashed transition-all ${
                  hasAnswered 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{hasAnswered ? '✅' : '💬'}</div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {hasAnswered 
                      ? 'Réponse envoyée ! Attendez les résultats...' 
                      : 'Tapez votre réponse dans le chat pour participer !'
                    }
                  </p>
                  {!hasAnswered && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Vous pouvez taper la lettre (A, B, C, D) ou la réponse complète
                    </p>
                  )}
                </div>
              </motion.div>
              
              <AnimatePresence>
                {winner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    className="mt-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg text-center"
                  >
                    <motion.div 
                      className="text-4xl mb-2"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      🎉
                    </motion.div>
                    <div className="font-bold text-lg text-yellow-800 dark:text-yellow-200">
                      🏆 {winner} remporte cette manche !
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      +10 points • Première bonne réponse
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-xl">💡</span>
                      <div>
                        <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          Explication
                        </div>
                        <div className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                          {explanation}
                        </div>
                        {currentQuestion.source && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 opacity-75">
                            Source: {currentQuestion.source}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isLoading && !currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 text-center"
          >
            <motion.div
              className="text-4xl mb-3"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              🔄
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">Préparation de la prochaine question...</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Préparation en cours...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center">
              <span className="text-2xl mr-2">🏆</span>
              Classement en Direct
            </h3>
            {playerRank > 0 && (
              <div className="text-xs bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-full">
                Votre rang: #{playerRank}
              </div>
            )}
          </div>
          
          {!leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-gray-600 dark:text-gray-400">Aucun joueur pour le moment</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Soyez le premier à répondre correctement !
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((player, index) => {
                const isCurrentUser = player.userId === socket?.userId;
                return (
                  <motion.div
                    key={`${player.userId || 'unknown'}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex justify-between items-center p-3 rounded-lg transition-all hover:scale-[1.02] ${
                      isCurrentUser
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700'
                        : index === 0
                        ? 'bg-gradient-to-r from-yellow-200 to-yellow-100 dark:from-yellow-800/50 dark:to-yellow-700/30 shadow-md'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/30'
                        : index === 2
                        ? 'bg-gradient-to-r from-orange-200 to-orange-100 dark:from-orange-800/50 dark:to-orange-700/30'
                        : 'bg-white/70 dark:bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-bold">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                      </span>
                      <div>
                        <div className={`font-semibold ${isCurrentUser ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                          {player.username} {isCurrentUser && '(Vous)'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.score > 0 ? `${Math.floor(player.score / 10)} bonnes réponses` : 'Nouveau joueur'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${isCurrentUser ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                        {player.score || 0}
                      </div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}