'use client'

import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import GenderAvatar from '@/components/ui/GenderAvatar'
import AIAgentChatBox from './AIAgentChatBox'
import { UserListSkeleton } from '@/components/ui/skeletons'
import { UserCheck, Users, MessageCircle } from 'lucide-react'

interface User {
  id: string
  username: string
  isOnline: boolean
  avatarUrl?: string
  sexe?: string
}

interface UsersOnlineProps {
  socket: Socket | null
  currentRoom?: string
  onSelectAgent?: (agent: any) => void
}

const UsersOnline: React.FC<UsersOnlineProps> = ({ socket, currentRoom, onSelectAgent }) => {
  const [users, setUsers] = useState<User[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)

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
          sexe: item.sexe || 'autre',
          isOnline: true
        }
      })
      setUsers(onlineUsers)
      setLoading(false)
    }

    const handleRoomUsersUpdate = (payload: any[] | { room: string; users: any[] }) => {
      const list = Array.isArray(payload) ? payload : (payload.users || [])
      const onlineUsers = list.map((item, index) => {
        if (typeof item === 'string') return { id: `room_user_${index}`, username: item, isOnline: true }
        return { id: `room_user_${index}`, username: item.username, avatarUrl: item.avatarUrl || undefined, sexe: item.sexe || 'autre', isOnline: true }
      })
      setUsers(onlineUsers)
      setLoading(false)
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
        {loading ? (
          !isCollapsed && <UserListSkeleton count={5} />
        ) : users.length === 0 ? (
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
                <GenderAvatar
                  username={user.username}
                  avatarUrl={user.avatarUrl}
                  sexe={user.sexe}
                  size="sm"
                  className="w-7 h-7"
                  clickable={false}
                />
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
        <div className="p-3 border-t border-gray-200/50 dark:border-white/10 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/30">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Assistants IA</p>
          </div>
          <div className="space-y-2">
            {[
              { id: 'alex', name: 'Alex', avatar: '🤖', description: 'Assistant général', gradient: 'from-blue-500 to-cyan-500' },
              { id: 'emma', name: 'Emma', avatar: '👩‍💻', description: 'Spécialiste tech', gradient: 'from-purple-500 to-pink-500' }
            ].map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent?.(agent)}
                className="w-full group relative overflow-hidden bg-white dark:bg-gray-800/50 hover:bg-gradient-to-r hover:from-white hover:to-gray-50 dark:hover:from-gray-800/70 dark:hover:to-gray-700/50 border border-gray-200/60 dark:border-gray-600/40 hover:border-gray-300 dark:hover:border-gray-500 rounded-xl p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center space-x-3">
                  <div className={`relative w-10 h-10 bg-gradient-to-br ${agent.gradient} rounded-full flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform duration-200`}>
                    <span className="filter drop-shadow-sm">{agent.avatar}</span>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">
                      {agent.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {agent.description}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className={`absolute inset-0 bg-gradient-to-r ${agent.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl`}></div>
              </button>
            ))}
          </div>
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