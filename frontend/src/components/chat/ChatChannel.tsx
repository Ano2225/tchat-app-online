'use client'

import React, { useState, useEffect } from 'react'
import axiosInstance from '@/utils/axiosInstance'
import { useAuthStore } from '@/store/authStore'

interface Channel {
  _id: string
  name: string
  createdAt: string
}

interface ChatChannelProps {
  onJoinRoom: (roomName: string) => void
  currentRoom: string
  socket?: import('socket.io-client').Socket | null
}

const ChatChannel: React.FC<ChatChannelProps> = ({ onJoinRoom, currentRoom, socket }) => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((state) => state.user)
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await axiosInstance.get('/channels')
        setChannels(response.data)
      } catch (error) {
        console.error('Erreur lors du chargement des canaux:', error)
        setChannels([])
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()
    // If socket available, request counts for default channels
    // (will request again after channels are set)
  }, [])

  // Listen to socket updates for room user lists
  useEffect(() => {
    if (!socket) return

    const handleRoomUsers = (payload: any) => {
      // payload: { room: string, users: string[] }
      if (!payload) return
      const room = payload.room || payload.roomName || null
      const users = Array.isArray(payload.users) ? payload.users : []
      if (room) {
        setRoomCounts((prev) => ({ ...prev, [room]: users.length }))
      }
    }

    socket.on('update_room_user_list', handleRoomUsers)

    return () => {
      socket.off('update_room_user_list', handleRoomUsers)
    }
  }, [socket])

  const getChannelIcon = (name: string) => {
    const icons: { [key: string]: string } = {
      'General': '💬',
      'Tech': '💻',
      'Gaming': '🎮',
      'Music': '🎵',
      'Random': '🎲',
      'Sport': '⚽',
      'Cinema': '🎬'
    }
    return icons[name] || '📢'
  }

  const getChannelDescription = (name: string) => {
    const descriptions: { [key: string]: string } = {
      'General': 'Discussion générale',
      'Music': 'Musique',
      'Sport': 'Sports',
    }
    return descriptions[name] || 'Canal de discussion'
  }

  if (loading) {
    return (
      <div className="w-full md:w-60 h-full bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-lg">
        <div className="p-3 border-b border-gray-300 dark:border-white/20">
          <div className="skeleton h-6 w-24 mb-2"></div>
          <div className="skeleton h-4 w-32"></div>
        </div>
        <div className="p-2 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-14 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full md:w-60 h-full bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-3 border-b border-gray-300 dark:border-white/20">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Salons</h2>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {channels.length > 0 ? `${channels.length} salon${channels.length > 1 ? 's' : ''}` : 'Chargement...'}
        </p>
      </div>

      {/* Liste des salons */}
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
        {/* Canal Game spécial - Seulement pour les utilisateurs inscrits */}
        {user && !user.isAnonymous && (
          <button
            onClick={() => onJoinRoom('Game')}
            className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              currentRoom === 'Game'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-[1.02]'
                : 'hover:bg-purple-100 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 hover:scale-[1.01]'
            }`}
            aria-label="Join Game channel"
            aria-current={currentRoom === 'Game' ? 'page' : undefined}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">🎮</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${
                  currentRoom === 'Game' ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  #Game
                </p>
                <p className={`text-xs truncate ${
                  currentRoom === 'Game' 
                    ? 'text-white/80' 
                    : 'text-purple-600 dark:text-purple-400'
                }`}>
                  Quiz en temps réel
                </p>
              </div>
              {currentRoom === 'Game' && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </div>
          </button>
        )}
        
        {/* Séparateur - Seulement si Game est visible */}
        {user && !user.isAnonymous && (
          <div className="border-t border-gray-300 dark:border-white/20 my-2"></div>
        )}
        

        
        {/* Autres canaux */}
        {channels.map((channel) => (
          <button
            key={channel._id}
            onClick={() => onJoinRoom(channel.name)}
            className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              currentRoom === channel.name
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md scale-[1.02]'
                : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 hover:scale-[1.01]'
            }`}
            aria-label={`Join ${channel.name} channel`}
            aria-current={currentRoom === channel.name ? 'page' : undefined}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">{getChannelIcon(channel.name)}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${
                  currentRoom === channel.name ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  #{channel.name}
                </p>
                <p className={`text-xs truncate ${
                  currentRoom === channel.name 
                    ? 'text-white/80' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {getChannelDescription(channel.name)}
                </p>
              </div>
              {currentRoom === channel.name && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-300 dark:border-white/20">
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></div>
          <span className="truncate">#{currentRoom}</span>
        </div>
      </div>
    </div>
  )
}

export default ChatChannel