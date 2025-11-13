'use client';

import { motion } from 'framer-motion';

interface GameMessageProps {
  content: string;
  timestamp: string;
}

export default function GameMessage({ content, timestamp }: GameMessageProps) {
  const isQuestion = content.includes('❓ **NOUVELLE QUESTION');
  const isExplanation = content.includes('💡 **EXPLICATION**');
  const isWinner = content.includes('🎉 **BONNE RÉPONSE !**');
  const isTransition = content.includes('⏳ **Prochaine question');

  const getMessageStyle = () => {
    if (isQuestion) {
      return 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-300 dark:border-blue-700';
    }
    if (isExplanation) {
      return 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700';
    }
    if (isWinner) {
      return 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-300 dark:border-yellow-700';
    }
    if (isTransition) {
      return 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-300 dark:border-purple-700';
    }
    return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
  };

  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-lg">$1</strong>')
      .replace(/\n/g, '<br />')
      .replace(/(🅰️|🅱️|🅲️|🅳️|A\)|B\)|C\)|D\))/g, '<span class="font-semibold text-blue-600 dark:text-blue-400">$1</span>')
      .replace(/(🥇|🥈|🥉|1\.|2\.|3\.|4\.|5\.)/g, '<span class="font-bold text-yellow-600 dark:text-yellow-400">$1</span>');
  };

  const getIcon = () => {
    if (isQuestion) return '❓';
    if (isExplanation) return '💡';
    if (isWinner) return '🏆';
    if (isTransition) return '⏳';
    return '🤖';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-xl border-2 ${getMessageStyle()} mb-3 shadow-lg`}
    >
      <div className="flex items-center gap-3 mb-3">
        <motion.div 
          className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-md"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-white text-lg">{getIcon()}</span>
        </motion.div>
        <div>
          <div className="font-bold text-purple-700 dark:text-purple-300 text-lg">Quiz Bot</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      <div 
        className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed"
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    </motion.div>
  );
}