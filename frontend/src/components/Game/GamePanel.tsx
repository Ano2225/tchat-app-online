'use client';

import { useGame } from '@/hooks/useGame';
import { motion } from 'framer-motion';

interface GamePanelProps {
  channel: string;
  socket?: any;
}

export default function GamePanel({ channel, socket }: GamePanelProps) {
  const {
    isActive,
    currentQuestion,
    leaderboard,
    timeLeft,
    hasAnswered,
    lastAnswer,
    winner,
    explanation,
    submitAnswer
  } = useGame(channel, socket);

  // Ne pas afficher le panel si ce n'est pas le canal Game
  if (channel !== 'Game') {
    return null;
  }

  if (!isActive) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
          <div className="text-4xl mb-3">🎮</div>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Quiz Chat</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Répondez aux questions directement dans le chat !
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            💬 Tapez votre réponse • 🏆 Premier = 10 points
          </div>
          <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
            🔄 Le quiz démarre automatiquement...
          </div>
        </div>
        
        {/* Classement même quand le jeu n'est pas actif */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-lg font-semibold mb-3">🏆 Classement</h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((player, index) => (
                <div
                  key={`inactive-${player.userId || 'unknown'}-${index}-${player.username || 'noname'}`}
                  className={`flex justify-between items-center p-2 rounded ${
                    index === 0
                      ? 'bg-yellow-100 dark:bg-yellow-800/30'
                      : 'bg-white dark:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span>{player.username}</span>
                  </div>
                  <span className="font-bold">{player.score || 0} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Question actuelle */}
      {currentQuestion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">❓ Question</h3>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-mono px-2 py-1 rounded ${
                timeLeft > 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {timeLeft}s
              </span>
            </div>
          </div>
          
          <p className="text-lg mb-4">{currentQuestion.question}</p>
          
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              💬 Tapez votre réponse dans le chat pour participer !
            </p>
            {hasAnswered && (
              <div className="mt-2 text-center text-green-600 dark:text-green-400 text-sm">
                ✓ Réponse envoyée !
              </div>
            )}
          </div>
          
          {winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-center"
            >
              <div className="text-2xl mb-1">🎉</div>
              <div className="font-bold text-yellow-800">
                {winner} a gagné cette manche!
              </div>
            </motion.div>
          )}
          
          {explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="font-semibold text-blue-800 mb-1">💡 Explication:</div>
              <div className="text-blue-700 text-sm">{explanation}</div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Classement */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h3 className="text-lg font-semibold mb-3">🏆 Classement</h3>
        {!leaderboard || leaderboard.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">Aucun joueur pour le moment</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((player, index) => (
              <div
                key={`${player.userId || 'unknown'}-${index}-${player.username || 'noname'}`}
                className={`flex justify-between items-center p-2 rounded ${
                  index === 0
                    ? 'bg-yellow-100 dark:bg-yellow-800/30'
                    : index === 1
                    ? 'bg-gray-100 dark:bg-gray-700/30'
                    : index === 2
                    ? 'bg-orange-100 dark:bg-orange-800/30'
                    : 'bg-white dark:bg-gray-800/30'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span>{player.username}</span>
                </div>
                <span className="font-bold">{player.score || 0} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}