'use client'

import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import { getAvatarColor, getInitials } from '@/utils/avatarUtils'

interface User {
  id: string
  username: string
  isOnline: boolean
  avatarUrl?: string
}

interface UsersOnlineProps {
  socket: Socket | null
  currentRoom?: string
}

const UsersOnline: React.FC<UsersOnlineProps> = ({ socket, currentRoom }) => {
  const [users, setUsers] = useState<User[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!socket) return

    const handleGlobalUsersUpdate = (usernames: any[] | { room: string; users: any[] }) => {
      // If server sends an object, normalize to user list
      const list = Array.isArray(usernames) ? usernames : (usernames.users || [])
      const onlineUsers = list.map((item, index) => {
        if (typeof item === 'string') {
          return { id: `user_${index}`, username: item, isOnline: true }
        }
        // Expecting { username, avatarUrl }
        return {
          id: `user_${index}`,
          username: item.username,
          avatarUrl: item.avatarUrl || undefined,
          isOnline: true
        }
      })
      setUsers(onlineUsers)
    }

    const handleRoomUsersUpdate = (payload: any[] | { room: string; users: any[] }) => {
      const list = Array.isArray(payload) ? payload : (payload.users || [])
      const onlineUsers = list.map((item, index) => {
        if (typeof item === 'string') return { id: `room_user_${index}`, username: item, isOnline: true }
        return { id: `room_user_${index}`, username: item.username, avatarUrl: item.avatarUrl || undefined, isOnline: true }
      })
      setUsers(onlineUsers)
    }

    socket.on('update_user_list', handleGlobalUsersUpdate)
    socket.on('update_room_user_list', handleRoomUsersUpdate)

    // If component knows currentRoom, ask server for the current list
    if (currentRoom) {
      socket.emit('get_room_users', currentRoom)
    }

    return () => {
      socket.off('update_user_list', handleGlobalUsersUpdate)
      socket.off('update_room_user_list', handleRoomUsersUpdate)
    }
  }, [socket, currentRoom])

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'bg-green-500' : 'bg-gray-400'
  }



  return (
    <div className={`h-full bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden transition-all duration-300 shadow-lg ${
      isCollapsed ? 'w-16' : 'w-full md:w-56'
    }`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-300 dark:border-white/20 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              En ligne
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {users.length} utilisateur{users.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          title={isCollapsed ? 'Développer' : 'Réduire'}
          aria-label={isCollapsed ? 'Expand users list' : 'Collapse users list'}
          aria-expanded={!isCollapsed}
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
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
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
              className="w-full flex items-center space-x-2.5 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer group relative"
              title={isCollapsed ? user.username : undefined}
              role="button"
              tabIndex={0}
              aria-label={`User ${user.username} - ${user.isOnline ? 'Online' : 'Offline'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Handle user click
                }
              }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {user.avatarUrl && user.avatarUrl.startsWith('http') ? (
                  <img 
                    src={user.avatarUrl.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/')} 
                    alt={user.username}
                    className="w-7 h-7 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className={`w-7 h-7 bg-gradient-to-r ${getAvatarColor(user.username)} rounded-full flex items-center justify-center shadow-sm`}>
                    <span className="text-xs font-bold text-white">
                      {getInitials(user.username)}
                    </span>
                  </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${getStatusColor(user.isOnline)} rounded-full border-2 border-white dark:border-gray-800 shadow-sm`}></div>
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
                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    title="Message privé"
                    aria-label={`Send private message to ${user.username}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle private message
                    }}
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
        <div className="p-2.5 border-t border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Total: {users.length}</span>
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-secondary-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersOnline