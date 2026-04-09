'use client'

import React, { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import GenderAvatar from '@/components/ui/GenderAvatar'
import AdminBadge from '@/components/ui/AdminBadge'
import { UserListSkeleton } from '@/components/ui/skeletons'
import { ChevronRight, Users, X } from 'lucide-react'

interface User {
  id: string
  userId?: string
  username: string
  isOnline: boolean
  avatarUrl?: string
  sexe?: string
  role?: string
  isBot?: boolean
}

interface UnreadEntry {
  count: number
  sender: { _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string }
}

interface UsersOnlineProps {
  socket: Socket | null
  currentRoom?: string
  unreadMap?: Record<string, UnreadEntry>
  onOpenChat?: (user: { _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string }) => void
  onSelectAgent?: (agent: unknown) => void
  onClose?: () => void
}

const UsersOnline: React.FC<UsersOnlineProps> = ({ socket, currentRoom, unreadMap = {}, onOpenChat, onClose }) => {
  const [users, setUsers] = useState<User[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!socket) return

    type UserPayloadItem = string | { username: string; userId?: string; avatarUrl?: string; sexe?: string }
    type UsersPayload = UserPayloadItem[] | { room: string; users: UserPayloadItem[] }

    const normalize = (list: UserPayloadItem[], prefix: string): User[] =>
      list.map((item, i) => {
        if (typeof item === 'string') return { id: `${prefix}_${i}`, username: item, isOnline: true }
        return {
          id: item.userId || item.username || `${prefix}_${i}`,
          userId: item.userId,
          username: item.username,
          avatarUrl: item.avatarUrl || undefined,
          sexe: item.sexe || 'autre',
          role: (item as { role?: string }).role,
          isOnline: true,
          isBot: (item as { isBot?: boolean }).isBot || false,
        }
      })

    const handleGlobalUsersUpdate = (payload: UsersPayload) => {
      if (!currentRoom) {
        const list = Array.isArray(payload) ? payload : (payload.users || [])
        setUsers(normalize(list, 'user'))
        setLoading(false)
      }
    }

    const handleRoomUsersUpdate = (payload: UsersPayload) => {
      const payloadRoom = !Array.isArray(payload) ? payload.room : null
      if (!currentRoom || !payloadRoom || payloadRoom === currentRoom) {
        const list = Array.isArray(payload) ? payload : (payload.users || [])
        setUsers(normalize(list, 'room'))
        setLoading(false)
      }
    }

    const handlePresenceUpdate = ({ userId, isOnline }: { userId: string; username: string; isOnline: boolean }) => {
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, isOnline } : u))
    }

    socket.on('update_user_list', handleGlobalUsersUpdate)
    socket.on('update_room_user_list', handleRoomUsersUpdate)
    socket.on('presence_update', handlePresenceUpdate)

    const requestUsers = () => {
      if (currentRoom && socket.connected) socket.emit('get_room_users', currentRoom)
    }
    const handleConnect = () => { if (currentRoom) setTimeout(requestUsers, 1500) }

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

  const totalUnread = Object.values(unreadMap).reduce((sum, e) => sum + e.count, 0)

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)',
        width: isCollapsed ? '52px' : undefined,
        minWidth: isCollapsed ? undefined : 'clamp(140px, 15vw, 200px)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-3.5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <div className="min-w-0">
              <h3
                className="text-sm font-bold leading-tight"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
              >
                En ligne
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {users.length} utilisateur{users.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
        <div className="relative flex-shrink-0 ml-auto flex items-center gap-1">
          {/* Close button — mobile only */}
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
          {/* Collapse button — desktop only */}
          <button
            onClick={() => setIsCollapsed(v => !v)}
            aria-label={isCollapsed ? 'Développer' : 'Réduire'}
            aria-expanded={!isCollapsed}
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg transition-all focus:outline-none"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
              (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <ChevronRight
              className="w-4 h-4 transition-transform duration-200"
              style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
          </button>
          {isCollapsed && totalUnread > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white rounded-full"
              style={{ background: 'var(--danger)', fontFamily: 'var(--font-ui)' }}
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-0.5">
        {loading ? (
          !isCollapsed && <UserListSkeleton count={5} />
        ) : users.length === 0 ? (
          !isCollapsed && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Aucun utilisateur en ligne
            </div>
          )
        ) : (
          users.map(u => {
            const unread = u.userId ? unreadMap[u.userId] : undefined
            const canChat = !!u.userId && !!onOpenChat && !u.isBot

            return (
              <div
                key={u.id}
                role="listitem"
                aria-label={`${u.username}${unread ? ` — ${unread.count} non lu(s)` : ''}`}
                onClick={() =>
                  canChat && onOpenChat({ _id: u.userId!, username: u.username, avatarUrl: u.avatarUrl, sexe: u.sexe, role: u.role })
                }
                className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-200 ${canChat ? 'cursor-pointer' : ''}`}
                onMouseEnter={e => {
                  if (canChat) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Avatar + online dot */}
                <div className="relative flex-shrink-0">
                  <GenderAvatar
                    username={u.username}
                    avatarUrl={u.avatarUrl}
                    sexe={u.sexe}
                    size="sm"
                    className="w-7 h-7 rounded-lg"
                    clickable={false}
                  />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      background: u.isOnline ? 'var(--online)' : 'var(--text-muted)',
                      borderColor: 'var(--bg-panel)',
                    }}
                  />
                </div>

                {/* Name + unread (when expanded) */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        fontFamily: 'var(--font-ui)',
                        color: unread ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: unread ? '600' : '500',
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5 max-w-full">
                        <span className="truncate">{u.username}</span>
                        {u.role === 'admin' && <AdminBadge className="flex-shrink-0" />}
                      </span>
                    </p>
                    {unread && unread.count > 0 && (
                      <span
                        className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1"
                        style={{ background: 'var(--danger)', fontFamily: 'var(--font-ui)' }}
                      >
                        {unread.count > 99 ? '99+' : unread.count}
                      </span>
                    )}
                  </div>
                )}

                {/* Unread dot when collapsed */}
                {isCollapsed && unread && unread.count > 0 && (
                  <span
                    className="absolute top-0 right-0 w-2 h-2 rounded-full"
                    style={{ background: 'var(--danger)' }}
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {!isCollapsed && users.length > 0 && (
        <div
          className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
            {users.length} en ligne
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
              style={{ background: 'var(--online)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              Live
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersOnline
