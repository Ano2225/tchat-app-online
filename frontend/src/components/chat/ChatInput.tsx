'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { EmojiStyle, type EmojiClickData } from 'emoji-picker-react'
import { useAuthStore } from '@/store/authStore'
import { Socket } from 'socket.io-client'
import GenderAvatar from '@/components/ui/GenderAvatar'

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

interface MentionUser {
  id: string;
  username: string;
  avatarUrl?: string;
  sexe?: string;
}

interface ChatInputProps {
  currentRoom: string
  socket: Socket | null
  replyTo?: Message | null
  onCancelReply?: () => void
  mentionUsers?: MentionUser[]
}

// Detect @mention query from input value + cursor position
function getMentionState(value: string, cursorPos: number): { start: number; query: string } | null {
  const before = value.slice(0, cursorPos)
  const atIdx = before.lastIndexOf('@')
  if (atIdx === -1) return null
  const fragment = before.slice(atIdx + 1)
  // If there's a space after @ — not a mention trigger
  if (fragment.includes(' ')) return null
  return { start: atIdx, query: fragment.toLowerCase() }
}

const ChatInput: React.FC<ChatInputProps> = ({
  currentRoom,
  socket,
  replyTo,
  onCancelReply,
  mentionUsers = [],
}) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ bottom: number; right: number } | null>(null)

  // Mention state
  const [mentionState, setMentionState] = useState<{ start: number; query: string } | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionDropdownPos, setMentionDropdownPos] = useState<{ bottom: number; left: number; width: number } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const mentionListRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((state) => state.user)

  // Filter mention candidates
  const mentionCandidates = mentionState
    ? mentionUsers
        .filter(u =>
          u.id !== user?.id &&
          u.username.toLowerCase().startsWith(mentionState.query) ||
          (mentionState.query.length >= 2 && u.username.toLowerCase().includes(mentionState.query))
        )
        .slice(0, 6)
    : []

  // Keep mention index in range when candidates change
  useEffect(() => {
    setMentionIndex(0)
  }, [mentionState?.query])

  // Compute dropdown position above the input container
  const updateMentionPos = useCallback(() => {
    if (!inputContainerRef.current) return
    const rect = inputContainerRef.current.getBoundingClientRect()
    setMentionDropdownPos({
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  // Insert @username into the message at the right position
  const insertMention = useCallback((username: string) => {
    if (!mentionState || !inputRef.current) return
    const { start, query } = mentionState
    const before = message.slice(0, start)
    const after = message.slice(start + 1 + query.length)
    const inserted = `${before}@${username} ${after}`
    setMessage(inserted)
    setMentionState(null)
    const newCursor = before.length + 1 + username.length + 1
    // Restore focus + cursor position after React re-render
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursor, newCursor)
      }
    })
  }, [message, mentionState])

  // Emoji picker
  const openPicker = useCallback(() => {
    if (!emojiButtonRef.current) return
    const rect = emojiButtonRef.current.getBoundingClientRect()
    setPickerPos({
      bottom: window.innerHeight - rect.top + 8,
      right: window.innerWidth - rect.right,
    })
    setShowEmojiPicker(true)
  }, [])

  useEffect(() => {
    if (!showEmojiPicker) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (emojiPickerRef.current?.contains(target)) return
      if (emojiButtonRef.current?.contains(target)) return
      setShowEmojiPicker(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowEmojiPicker(false)
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

  // Close mention dropdown on outside click
  useEffect(() => {
    if (!mentionState) return
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (mentionListRef.current?.contains(target)) return
      if (inputRef.current?.contains(target)) return
      setMentionState(null)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [mentionState])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !socket || !user) return

    const replyPreview = replyTo
      ? {
          _id: replyTo._id,
          content: replyTo.content,
          sender: { _id: replyTo.sender?._id, username: replyTo.sender?.username },
        }
      : null

    socket.emit('send_message', {
      content: message.trim(),
      room: currentRoom,
      sender: { id: user.id, username: user.username },
      replyTo: replyTo?._id || null,
      replyPreview,
    })
    setMessage('')
    setIsTyping(false)
    setShowEmojiPicker(false)
    setMentionState(null)
    if (onCancelReply) onCancelReply()
    if (inputRef.current) inputRef.current.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setMessage(val)

    if (!user) return

    // Typing indicators
    if (!isTyping && val.length > 0) {
      setIsTyping(true)
      socket?.emit('typing_start', { room: currentRoom, username: user.username })
    } else if (isTyping && val.length === 0) {
      setIsTyping(false)
      socket?.emit('typing_stop', { room: currentRoom, username: user.username })
    }

    // Mention detection
    const cursor = e.target.selectionStart ?? val.length
    const state = getMentionState(val, cursor)
    if (state && mentionUsers.length > 0) {
      setMentionState(state)
      updateMentionPos()
    } else {
      setMentionState(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Mention dropdown keyboard navigation
    if (mentionState && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % mentionCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(mentionCandidates[mentionIndex].username)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionState(null)
        return
      }
    }

    // Normal send on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setMessage(prev => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
    if (inputRef.current) inputRef.current.focus()
  }

  const showMentionDropdown = mentionState !== null && mentionCandidates.length > 0

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
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Input pill */}
        <div
          ref={inputContainerRef}
          className="flex-1 relative min-w-0 flex items-end rounded-2xl px-3 py-2 gap-2 transition-all"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={currentRoom === 'Game' ? 'Tapez votre réponse...' : `Message dans ${currentRoom}…`}
            className="flex-1 bg-transparent focus:outline-none min-w-0 pr-10"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--accent)', fontSize: '16px' }}
            maxLength={1000}
            autoComplete="off"
            aria-label="Message input"
            aria-autocomplete="list"
            aria-expanded={showMentionDropdown}
          />

          {/* Character counter */}
          <span
            className="absolute bottom-2 right-3 text-[10px] pointer-events-none select-none"
            style={{ color: 'var(--text-muted)' }}
          >
            {message.length}/1000
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => showEmojiPicker ? setShowEmojiPicker(false) : openPicker()}
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

          <button
            type="submit"
            disabled={!message.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none"
            style={{ background: message.trim() ? 'var(--accent)' : 'var(--bg-elevated)' }}
            title={currentRoom === 'Game' ? 'Envoyer réponse/message' : 'Envoyer le message'}
            aria-label="Send message"
          >
            <svg className="w-4 h-4" fill="none" stroke={message.trim() ? '#fff' : 'var(--text-muted)'} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>

      {/* Typing indicator */}
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

      {/* ── Mention dropdown ── portal to avoid overflow clipping */}
      {showMentionDropdown && mentionDropdownPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={mentionListRef}
          role="listbox"
          aria-label="Suggestions de mention"
          style={{
            position: 'fixed',
            bottom: mentionDropdownPos.bottom,
            left: mentionDropdownPos.left,
            width: mentionDropdownPos.width,
            zIndex: 99998,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            maxWidth: '420px',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '8px 12px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>@</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', letterSpacing: '0.04em' }}>
              {mentionState.query ? `"${mentionState.query}"` : 'Mentionner un utilisateur'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              ↑↓ · Tab/↵
            </span>
          </div>

          {/* User list */}
          <div style={{ padding: '4px' }}>
            {mentionCandidates.map((u, i) => {
              const isActive = i === mentionIndex
              const query = mentionState.query

              // Highlight matching portion in username
              const lower = u.username.toLowerCase()
              const matchIdx = lower.indexOf(query)
              let label: React.ReactNode = u.username
              if (query && matchIdx !== -1) {
                label = (
                  <>
                    {u.username.slice(0, matchIdx)}
                    <mark style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: '2px', padding: '0 1px' }}>
                      {u.username.slice(matchIdx, matchIdx + query.length)}
                    </mark>
                    {u.username.slice(matchIdx + query.length)}
                  </>
                )
              }

              return (
                <button
                  key={u.id}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent blur on input
                    insertMention(u.username)
                  }}
                  onMouseEnter={() => setMentionIndex(i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '7px 10px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                    transition: 'background 0.1s',
                    textAlign: 'left' as const,
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <GenderAvatar
                      username={u.username}
                      avatarUrl={u.avatarUrl}
                      sexe={u.sexe}
                      size="sm"
                      className="w-7 h-7 rounded-lg"
                      clickable={false}
                    />
                    {/* Online dot */}
                    <span
                      style={{
                        position: 'absolute', bottom: '-1px', right: '-1px',
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: 'var(--online)', border: '2px solid var(--bg-panel)',
                      }}
                    />
                  </div>

                  {/* Username + tag */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600,
                      color: isActive ? 'var(--accent-text)' : 'var(--text-primary)',
                      display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>
                  </div>

                  {/* @ pill */}
                  <span style={{
                    fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    background: isActive ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    padding: '2px 7px', borderRadius: '20px',
                    border: `1px solid ${isActive ? 'var(--accent-glow)' : 'transparent'}`,
                    transition: 'all 0.1s',
                  }}>
                    @{u.username}
                  </span>
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Emoji picker — portal */}
      {showEmojiPicker && pickerPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={emojiPickerRef}
          style={{
            position: 'fixed',
            bottom: pickerPos.bottom,
            right: pickerPos.right,
            zIndex: 99999,
            filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.3))',
          }}
        >
          <EmojiPicker
            emojiStyle={EmojiStyle.NATIVE}
            onEmojiClick={onEmojiClick}
            width={Math.min(320, window.innerWidth - 16)}
            height={380}
          />
        </div>,
        document.body
      )}
    </div>
  )
}

export default ChatInput
