'use client'

import React, { useState, useEffect } from 'react'
import axiosInstance from '@/utils/axiosInstance'

interface Channel {
  _id: string
  name: string
  createdAt: string
}

interface ChatChannelProps {
  onJoinRoom: (roomName: string) => void
  currentRoom: string
}

const ChatChannel: React.FC<ChatChannelProps> = ({ onJoinRoom, currentRoom }) => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [])

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
      'Tech': 'Technologie',
      'Gaming': 'Jeux vidéo',
      'Music': 'Musique',
      'Random': 'Discussions libres',
      'Sport': 'Sports',
      'Cinema': 'Cinéma & Séries'
    }
    return descriptions[name] || 'Canal de discussion'
  }

  if (loading) {
    return (
      <div className="w-64 bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/20">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Salons</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Chargement...</p>
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 dark:bg-white/10 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 h-full bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/20">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Salons</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {channels.length > 0 ? `${channels.length} salon${channels.length > 1 ? 's' : ''} disponible${channels.length > 1 ? 's' : ''}` : 'Chargement des salons...'}
        </p>
      </div>

      {/* Liste des salons */}
      <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
        {channels.map((channel) => (
          <button
            key={channel._id}
            onClick={() => onJoinRoom(channel.name)}
            className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
              currentRoom === channel.name
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
            }`}
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
      <div className="p-4 border-t border-gray-200 dark:border-white/20">
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></div>
          <span>#{currentRoom}</span>
        </div>
      </div>
    </div>
  )
}

export default ChatChannel