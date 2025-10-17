'use client'

import React, { useState, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Socket } from 'socket.io-client'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  createdAt: string;
}

interface ChatInputProps {
  currentRoom: string
  socket: Socket | null
  replyTo?: Message | null
  onCancelReply?: () => void
}

const ChatInput: React.FC<ChatInputProps> = ({ currentRoom, socket, replyTo, onCancelReply }) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore((state) => state.user)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || !socket || !user) return

    const messageData = {
      content: message.trim(),
      room: currentRoom,
      sender: {
        id: user.id,
        username: user.username
      },
      replyTo: replyTo?._id || null
    }

    socket.emit('send_message', messageData)
    setMessage('')
    setIsTyping(false)
    setShowEmojiPicker(false)
    
    // Clear reply
    if (onCancelReply) {
      onCancelReply()
    }
    
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true)
      socket?.emit('typing_start', { room: currentRoom, username: user?.username })
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false)
      socket?.emit('typing_stop', { room: currentRoom, username: user?.username })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setMessage(prev => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-white/20 bg-gray-50/50 dark:bg-white/5 relative">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3 p-3 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-8 bg-primary-500 rounded-full"></div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Réponse à {replyTo.sender.username}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                {replyTo.content}
              </div>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded transition-colors"
            title="Annuler la réponse"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2 z-10">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Zone de saisie */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Tapez votre message dans ${currentRoom}...`}
            className="w-full bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
            maxLength={1000}
            autoComplete="off"
          />
          
          {/* Compteur de caractères */}
          <div className="absolute bottom-1 right-3 text-xs text-gray-400">
            {message.length}/1000
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 rounded-xl transition-all duration-200"
            title="Ajouter un emoji"
          >
            <span className="text-lg">😊</span>
          </button>

          {/* Bouton d'envoi */}
          <button
            type="submit"
            disabled={!message.trim()}
            className={`p-3 rounded-xl transition-all duration-200 ${
              message.trim()
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white'
                : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            title="Envoyer le message"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
              />
            </svg>
          </button>
        </div>
      </form>

      {/* Indicateur de frappe */}
      {isTyping && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-primary-500 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-secondary-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-1 h-1 bg-accent-500 rounded-full animate-bounce delay-200"></div>
          </div>
          <span>Vous tapez...</span>
        </div>
      )}
    </div>
  )
}

export default ChatInput