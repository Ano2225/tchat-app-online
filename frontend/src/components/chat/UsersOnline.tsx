'use client'

import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import GenderAvatar from '@/components/ui/GenderAvatar'
import { UserListSkeleton } from '@/components/ui/skeletons'

interface User {
  id: string
  userId?: string
  username: string
  isOnline: boolean
  avatarUrl?: string
  sexe?: string
}

interface UnreadEntry {
  count: number
  sender: { _id: string; username: string; avatarUrl?: string; sexe?: string }
}

interface UsersOnlineProps {
  socket: Socket | null
  currentRoom?: string
  unreadMap?: Record<string, UnreadEntry>
  onOpenChat?: (user: { _id: string; username: string; avatarUrl?: string; sexe?: string }) => void
  onSelectAgent?: (agent: unknown) => void
}

const UsersOnline: React.FC<UsersOnlineProps> = ({ socket, currentRoom, unreadMap = {}, onOpenChat }) => {
  const [users, setUsers] = useState<User[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!socket) return

    type UserPayloadItem = string | { username: string; userId?: string; avatarUrl?: string; sexe?: string }
    type UsersPayload = UserPayloadItem[] | { room: string; users: UserPayloadItem[] }

    const normalizeUsers = (list: UserPayloadItem[], prefix: string): User[] =>
      list.map((item, index) => {
        if (typeof item === 'string') {
          return { id: `${prefix}_${index}`, username: item, isOnline: true }
        }
        return {
          id: item.userId || item.username || `${prefix}_${index}`,
          userId: item.userId,
          username: item.username,
          avatarUrl: item.avatarUrl || undefined,
          sexe: item.sexe || 'autre',
          isOnline: true,
        }
      })

    const handleGlobalUsersUpdate = (usernames: UsersPayload) => {
      if (!currentRoom) {
        const list = Array.isArray(usernames) ? usernames : (usernames.users || [])
        setUsers(normalizeUsers(list, 'user'))
        setLoading(false)
      }
    }

    const handleRoomUsersUpdate = (payload: UsersPayload) => {
      const payloadRoom = !Array.isArray(payload) ? payload.room : null
      if (!currentRoom || !payloadRoom || payloadRoom === currentRoom) {
        const list = Array.isArray(payload) ? payload : (payload.users || [])
        setUsers(normalizeUsers(list, 'room_user'))
        setLoading(false)
      }
    }

    const handlePresenceUpdate = ({ userId, isOnline }: { userId: string; username: string; isOnline: boolean }) => {
      setUsers(prev => prev.map(u =>
        u.userId === userId ? { ...u, isOnline } : u
      ))
    }

    socket.on('update_user_list', handleGlobalUsersUpdate)
    socket.on('update_room_user_list', handleRoomUsersUpdate)
    socket.on('presence_update', handlePresenceUpdate)

    const requestUsers = () => {
      if (currentRoom && socket.connected) {
        socket.emit('get_room_users', currentRoom)
      }
    }

    const handleConnect = () => {
      if (currentRoom) setTimeout(requestUsers, 1500)
    }

    if (currentRoom) {
      socket.on('connect', handleConnect)
      if (socket.connected) setTimeout(requestUsers, 1500)
    } else {
      setLoading(false)
    }

    return () => {
      socket.off('update_user_list', handleGlobalUsersUpdate)
      socket.off('update_room_user_list', handleRoomUsersUpdate)
      socket.off('presence_update', handlePresenceUpdate)
      socket.off('connect', handleConnect)
    }
  }, [socket, currentRoom])

  // Total unread across all conversations (for collapsed badge)
  const totalUnread = Object.values(unreadMap).reduce((sum, e) => sum + e.count, 0)

  return (
    <div className={`h-full bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden transition-all duration-300 shadow-lg flex flex-col ${
      isCollapsed ? 'w-16' : 'w-full md:w-56'
    }`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-300 dark:border-white/20 flex items-center justify-between flex-shrink-0">
        {!isCollapsed && (
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">En ligne</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {users.length} utilisateur{users.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
        <div className="relative">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Développer la liste' : 'Réduire la liste'}
            aria-expanded={!isCollapsed}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <svg
              className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {isCollapsed && totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* User list */}
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
        {loading ? (
          !isCollapsed && <UserListSkeleton count={5} />
        ) : users.length === 0 ? (
          !isCollapsed && (
            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucun utilisateur en ligne
            </p>
          )
        ) : (
          users.map((u) => {
            const unread = u.userId ? unreadMap[u.userId] : undefined
            const canChat = !!u.userId && !!onOpenChat
            return (
              <div
                key={u.id}
                role="listitem"
                aria-label={`${u.username} — ${u.isOnline ? 'en ligne' : 'hors ligne'}${unread ? `, ${unread.count} message(s) non lu(s)` : ''}`}
                onClick={() => canChat && onOpenChat({ _id: u.userId!, username: u.username, avatarUrl: u.avatarUrl, sexe: u.sexe })}
                className={`flex items-center space-x-2.5 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200 ${canChat ? 'cursor-pointer' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <GenderAvatar
                    username={u.username}
                    avatarUrl={u.avatarUrl}
                    sexe={u.sexe}
                    size="sm"
                    className="w-7 h-7"
                    clickable={false}
                  />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${u.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                    aria-hidden="true"
                  />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {u.username}
                    </p>
                    {unread && unread.count > 0 && (
                      <span className="ml-1 flex-shrink-0 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
                        {unread.count > 99 ? '99+' : unread.count}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer count */}
      {!isCollapsed && users.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{users.length} en ligne</span>
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
              <span>Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersOnline
