'use client'

import React from 'react'

interface AIStatusProps {
  agentId: string
  isTyping?: boolean
}

const AIStatus: React.FC<AIStatusProps> = ({ agentId, isTyping }) => {
  const getStatus = () => {
    if (isTyping) {
      return {
        text: 'En train d\'écrire...',
        color: 'text-blue-500',
        icon: '✍️'
      }
    }
    
    const statuses = {
      alex: {
        text: 'Dispo pour papoter !',
        color: 'text-green-500',
        icon: '😎'
      },
      emma: {
        text: 'Là pour t\'écouter !',
        color: 'text-purple-500',
        icon: '🌸'
      }
    }
    
    return statuses[agentId as keyof typeof statuses] || statuses.alex
  }

  const status = getStatus()

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
      <span className={status.color}>
        {status.icon} {status.text}
      </span>
    </div>
  )
}

export default AIStatus