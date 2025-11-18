'use client'

import React from 'react'

interface QuickReactionsProps {
  onReactionClick: (reaction: string) => void
  agentId: string
}

const QuickReactions: React.FC<QuickReactionsProps> = ({ onReactionClick, agentId }) => {
  const reactions = {
    alex: [
      { emoji: '😄', text: 'Ah ouais ?' },
      { emoji: '😂', text: 'Mdr !' },
      { emoji: '🤔', text: 'Intéressant...' },
      { emoji: '🔥', text: 'Trop bien !' },
      { emoji: '😎', text: 'Cool mec !' },
      { emoji: '💪', text: 'Respect !' }
    ],
    emma: [
      { emoji: '🌸', text: 'Oh c\'est mignon !' },
      { emoji: '✨', text: 'J\'adore ça !' },
      { emoji: '🤗', text: 'Trop chou !' },
      { emoji: '😊', text: 'C\'est génial !' },
      { emoji: '💕', text: 'Adorable !' },
      { emoji: '🥰', text: 'Trop bien !' }
    ]
  }

  const agentReactions = reactions[agentId as keyof typeof reactions] || reactions.alex

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
      <p className="text-xs text-gray-600 dark:text-gray-400 w-full mb-1">
        ⚡ Réactions rapides :
      </p>
      {agentReactions.map((reaction, index) => (
        <button
          key={index}
          onClick={() => onReactionClick(reaction.text)}
          className="flex items-center space-x-1 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 rounded-full px-3 py-1.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <span>{reaction.emoji}</span>
          <span className="text-gray-700 dark:text-gray-300">{reaction.text}</span>
        </button>
      ))}
    </div>
  )
}

export default QuickReactions