'use client';

import { motion } from 'framer-motion';

interface GameMessageProps {
  content: string;
  timestamp: string;
}

export default function GameMessage({ content, timestamp }: GameMessageProps) {
  const isQuestion = content.includes('❓ **QUESTION QUIZ**');
  const isExplanation = content.includes('💡 **EXPLICATION**');
  const isWinner = content.includes('🏆');

  const getMessageStyle = () => {
    if (isQuestion) {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
    if (isExplanation) {
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
    if (isWinner) {
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
    return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
  };

  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${getMessageStyle()} mb-3`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">🤖</span>
        </div>
        <div>
          <div className="font-semibold text-purple-700 dark:text-purple-300">Quiz Bot</div>
          <div className="text-xs text-gray-500">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      <div 
        className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    </motion.div>
  );
}