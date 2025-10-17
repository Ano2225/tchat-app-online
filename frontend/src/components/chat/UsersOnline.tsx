'use client'

import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'

interface User {
  id: string
  username: string
  isOnline: boolean
}

interface UsersOnlineProps {
  socket: Socket | null
}

const UsersOnline: React.FC<UsersOnlineProps> = ({ socket }) => {
  const [users, setUsers] = useState<User[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!socket) return

    const handleUsersUpdate = (usernames: string[]) => {
      const onlineUsers = usernames.map((username, index) => ({
        id: `user_${index}`,
        username,
        isOnline: true
      }))
      setUsers(onlineUsers)
    }

    socket.on('update_user_list', handleUsersUpdate)
    // Pas besoin d'émettre get_online_users car le serveur émet automatiquement

    return () => {
      socket.off('update_user_list', handleUsersUpdate)
    }
  }, [socket])

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'bg-secondary-500' : 'bg-gray-400'
  }

  const getInitials = (username: string) => {
    return username.charAt(0).toUpperCase()
  }

  return (
    <div className={`h-full bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl overflow-hidden transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/20 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              En ligne
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {users.length} utilisateur{users.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200"
          title={isCollapsed ? 'Développer' : 'Réduire'}
        >
          <svg 
            className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${
              isCollapsed ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5l7 7-7 7" 
            />
          </svg>
        </button>
      </div>

      {/* Liste des utilisateurs */}
      <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-4 text-center">
            {!isCollapsed && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aucun utilisateur en ligne
              </p>
            )}
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer group"
              title={isCollapsed ? user.username : undefined}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-turquoise-500 to-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {getInitials(user.username)}
                  </span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.isOnline)} rounded-full border-2 border-white dark:border-gray-800`}></div>
              </div>

              {/* Informations utilisateur */}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.username}
                  </p>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 ${getStatusColor(user.isOnline)} rounded-full ${user.isOnline ? 'animate-pulse' : ''}`}></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isCollapsed && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded"
                    title="Message privé"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer avec statistiques */}
      {!isCollapsed && users.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-white/20 bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Total: {users.length}</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></div>
              <span>Temps réel</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersOnline