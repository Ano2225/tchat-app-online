'use client'

import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import { getAvatarColor, getInitials } from '@/utils/avatarUtils'
import AIAgentChatBox from './AIAgentChatBox'

interface User {
  id: string
  username: string
  isOnline: boolean
  avatarUrl?: string
}

interface UsersOnlineProps {
  socket: Socket | null
  currentRoom?: string
  onSelectAgent?: (agent: any) => void
}

const UsersOnline: React.FC<UsersOnlineProps> = ({ socket, currentRoom, onSelectAgent }) => {
  const [users, setUsers] = useState<User[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!socket) return

    const handleGlobalUsersUpdate = (usernames: any[] | { room: string; users: any[] }) => {
      const list = Array.isArray(usernames) ? usernames : (usernames.users || [])
      const onlineUsers = list.map((item, index) => {
        if (typeof item === 'string') {
          return { id: `user_${index}`, username: item, isOnline: true }
        }
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
        >
          <svg 
            className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${
              isCollapsed ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

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
            >
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
            </div>
          ))
        )}
      </div>

      {/* Agents IA */}
      {!isCollapsed && (
        <div className="p-2 border-t border-gray-200 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Assistants virtuels :</p>
          {[{ id: 'alex', name: 'Alex', avatar: '👨💬' }, { id: 'emma', name: 'Emma', avatar: '👩💬' }].map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent?.(agent)}
              className="w-full flex items-center space-x-2 p-2 mb-1 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30 rounded-lg transition-all"
            >
              <span className="text-lg">{agent.avatar}</span>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{agent.name}</span>
            </button>
          ))}
        </div>
      )}

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