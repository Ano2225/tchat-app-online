'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { EmojiClickData } from 'emoji-picker-react'
import { useAuthStore } from '@/store/authStore'
import { Socket } from 'socket.io-client'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="w-72 h-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-sm text-gray-500">
      Chargement des emojis...
    </div>
  )
})

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

const ChatInput: React.FC<ChatInputProps> = ({ 
  currentRoom, 
  socket, 
  replyTo, 
  onCancelReply
}) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!showEmojiPicker) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (emojiPickerRef.current?.contains(target)) return
      if (emojiButtonRef.current?.contains(target)) return
      setShowEmojiPicker(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showEmojiPicker])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || !socket || !user) return

    const replyPreview = replyTo
      ? {
          _id: replyTo._id,
          content: replyTo.content,
          sender: {
            _id: replyTo.sender?._id,
            username: replyTo.sender?.username
          }
        }
      : null

    const messageData = {
      content: message.trim(),
      room: currentRoom,
      sender: {
        id: user.id,
        username: user.username
      },
      replyTo: replyTo?._id || null,
      replyPreview
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
    
    if (!user) return // Protection contre user null
    
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true)
      socket?.emit('typing_start', { room: currentRoom, username: user.username })
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false)
      socket?.emit('typing_stop', { room: currentRoom, username: user.username })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
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
    <div
      className="p-3 md:p-4 relative flex-shrink-0"
      style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-panel)' }}
    >
      {/* Reply preview */}
      {replyTo && (
        <div
          className="mb-3 p-2.5 rounded-xl flex items-center justify-between animate-slide-down"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
            <div className="min-w-0 flex-1">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Réponse à {replyTo.sender.username}
              </div>
              <div className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                {replyTo.content}
              </div>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0 focus:outline-none"
            style={{ color: 'var(--text-muted)' }}
            title="Annuler la réponse"
            aria-label="Cancel reply"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full mb-2 z-10 transition-all duration-150 ease-out"
          style={{ right: 0, maxWidth: 'min(350px, calc(100vw - 16px))' }}
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            width={typeof window !== 'undefined' ? Math.min(350, window.innerWidth - 16) : 350}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Pill input */}
        <div
          className="flex-1 relative min-w-0 flex items-end rounded-2xl px-3 py-2 gap-2 transition-all"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={currentRoom === 'Game' ? 'Tapez votre réponse...' : `Message dans ${currentRoom}…`}
            className="flex-1 bg-transparent focus:outline-none min-w-0 pr-10"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--accent)', fontSize: '16px' }}
            maxLength={1000}
            autoComplete="off"
            aria-label="Message input"
          />

          {/* Compteur de caractères */}
          <span
            className="absolute bottom-2 right-3 text-[10px] pointer-events-none select-none"
            style={{ color: 'var(--text-muted)' }}
          >
            {message.length}/1000
          </span>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            ref={emojiButtonRef}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all focus:outline-none"
            style={{
              background: showEmojiPicker ? 'var(--accent-dim)' : 'var(--bg-surface)',
              border: `1px solid ${showEmojiPicker ? 'var(--accent)' : 'var(--border-default)'}`,
              color: showEmojiPicker ? 'var(--accent)' : 'var(--text-muted)',
            }}
            title="Ajouter un emoji"
            aria-label="Add emoji"
            aria-expanded={showEmojiPicker}
          >
            <span className="text-base leading-none">😊</span>
          </button>

          {/* Bouton d'envoi */}
          <button
            type="submit"
            disabled={!message.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none"
            style={{ background: message.trim() ? 'var(--accent)' : 'var(--bg-elevated)' }}
            title={currentRoom === 'Game' ? 'Envoyer réponse/message' : 'Envoyer le message'}
            aria-label="Send message"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke={message.trim() ? '#fff' : 'var(--text-muted)'}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>

      {/* Indicateur de frappe */}
      {isTyping && (
        <div className="mt-1.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--accent)' }} />
            <div className="w-1 h-1 rounded-full animate-bounce delay-100" style={{ background: 'var(--accent)' }} />
            <div className="w-1 h-1 rounded-full animate-bounce delay-200" style={{ background: 'var(--accent)' }} />
          </div>
          <span>Vous tapez…</span>
        </div>
      )}
    </div>
  )
}

export default ChatInput
