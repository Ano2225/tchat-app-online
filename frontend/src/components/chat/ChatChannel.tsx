'use client'

import React, { useState, useEffect } from 'react'
import axiosInstance from '@/utils/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { ChannelListSkeleton } from '@/components/ui/skeletons'
import { MessageCircle, Monitor, Gamepad2, Music, Dice6, CircleDot, Film, Megaphone, X } from 'lucide-react'

interface Channel {
  _id: string
  name: string
  createdAt: string
}

interface ChatChannelProps {
  onJoinRoom: (roomName: string) => void
  currentRoom: string
  socket?: import('socket.io-client').Socket | null
  onClose?: () => void
}

const ChatChannel: React.FC<ChatChannelProps> = ({ onJoinRoom, currentRoom, socket, onClose }) => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((state) => state.user)
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    axiosInstance.get('/channels')
      .then(res => setChannels(res.data))
      .catch(() => setChannels([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!socket) return
    const handleRoomUsers = (payload: { room?: string; roomName?: string; users?: unknown[] }) => {
      if (!payload) return
      const room = payload.room || payload.roomName || null
      const users = Array.isArray(payload.users) ? payload.users : []
      if (room) setRoomCounts(prev => ({ ...prev, [room]: users.length }))
    }
    socket.on('update_room_user_list', handleRoomUsers)
    return () => { socket.off('update_room_user_list', handleRoomUsers) }
  }, [socket])

  const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    General: MessageCircle,
    Tech: Monitor,
    Gaming: Gamepad2,
    Music: Music,
    Random: Dice6,
    Sport: CircleDot,
    Cinema: Film,
  }

  const channelDescriptions: Record<string, string> = {
    General: 'Discussion générale',
    Music: 'Partage musical',
    Sport: 'Actualité sportive',
    Tech: 'Technologie',
    Gaming: 'Jeux vidéo',
    Random: 'Sujets libres',
    Cinema: 'Films & séries',
  }

  const getIcon = (name: string) => channelIcons[name] || Megaphone

  if (loading) {
    return (
      <div
        className="w-full md:w-60 h-full rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="skeleton h-5 w-20 mb-1" />
          <div className="skeleton h-3.5 w-28" />
        </div>
        <ChannelListSkeleton count={5} />
      </div>
    )
  }

  return (
    <div
      className="w-full md:w-60 h-full flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}
    >
      {/* Header */}
      <div className="px-4 py-3.5 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h2
            className="text-base font-bold"
            style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
          >
            Salons
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {channels.length} disponible{channels.length > 1 ? 's' : ''}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl transition-all"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">

        {/* Game channel */}
        <button
          onClick={() => {
            if (!user || user.isAnonymous) {
              alert('Vous devez être inscrit pour accéder au canal Game.')
              return
            }
            onJoinRoom('Game')
            onClose?.()
          }}
          disabled={!user || !!user.isAnonymous}
          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group focus:outline-none focus:ring-2`}
          style={{
            background: currentRoom === 'Game' ? 'var(--accent)' : 'transparent',
            color: currentRoom === 'Game' ? '#FFFFFF' : 'var(--text-secondary)',
            boxShadow: 'none',
          }}
          onMouseEnter={e => {
            if (currentRoom !== 'Game' && user && !user.isAnonymous) {
              (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)';
              (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
            }
          }}
          onMouseLeave={e => {
            if (currentRoom !== 'Game') {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }
          }}
          aria-label="Salon Game"
          aria-current={currentRoom === 'Game' ? 'page' : undefined}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: currentRoom === 'Game' ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)',
              }}
            >
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-bold"
                  style={{
                    fontFamily: 'var(--font-ui)',
                    color: currentRoom === 'Game' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                  }}
                >
                  #
                </span>
                <p className="text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-ui)' }}>
                  Game
                </p>
              </div>
              <p
                className="text-xs truncate"
                style={{
                  color: currentRoom === 'Game'
                    ? 'rgba(255,255,255,0.65)'
                    : (!user || user.isAnonymous)
                      ? 'var(--text-muted)'
                      : 'var(--text-muted)',
                }}
              >
                {(!user || user.isAnonymous) ? '🔒 Inscription requise' : 'Quiz en temps réel'}
              </p>
            </div>
            {roomCounts['Game'] ? (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: currentRoom === 'Game' ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
                  color: currentRoom === 'Game' ? 'white' : 'var(--text-muted)',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {roomCounts['Game']}
              </span>
            ) : null}
          </div>
        </button>

        {/* Divider */}
        <div className="h-px mx-2 my-1" style={{ background: 'var(--border-subtle)' }} />

        {/* Regular channels */}
        {channels.map(channel => {
          const Icon = getIcon(channel.name)
          const isActive = currentRoom === channel.name
          const count = roomCounts[channel.name]

          return (
            <button
              key={channel._id}
              onClick={() => { onJoinRoom(channel.name); onClose?.() }}
              className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2"
              style={{
                background: isActive
                  ? 'var(--accent-dim)'
                  : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
              aria-label={`Rejoindre ${channel.name}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: isActive ? 'var(--accent-dim)' : 'var(--bg-surface)' }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs font-bold"
                      style={{
                        fontFamily: 'var(--font-ui)',
                        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      #
                    </span>
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ fontFamily: 'var(--font-ui)' }}
                    >
                      {channel.name}
                    </p>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {channelDescriptions[channel.name] || 'Canal de discussion'}
                  </p>
                </div>
                {count ? (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: isActive ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {count}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer — current room indicator */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
          style={{ background: 'var(--online)' }}
        />
        <span
          className="text-xs truncate"
          style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-muted)' }}
        >
          #{currentRoom}
        </span>
      </div>
    </div>
  )
}

export default ChatChannel
