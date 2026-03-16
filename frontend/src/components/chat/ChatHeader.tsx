'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Socket } from 'socket.io-client'
import axiosInstance from '@/utils/axiosInstance'
import Toast from '../ui/Toast'
import ThemeToggle from '../ui/ThemeToggle'
import ProfileModal from '../profile/ProfileModal'
import GenderAvatar from '@/components/ui/GenderAvatar'
import { LogOut, Settings, MessageSquare, Shield } from 'lucide-react'

interface ChatHeaderProps {
  users?: { id: string; username: string }
  socket: Socket | null
  totalUnread?: number
  onOpenChat?: (user: { _id: string; username: string; avatarUrl?: string; sexe?: string }) => void
}

interface Conversation {
  user: {
    _id: string
    username: string
    avatarUrl?: string
    sexe?: string
  }
  lastMessage?: {
    content?: string
    createdAt?: string
    sender?: { _id: string; username: string }
  }
  hasNewMessages: boolean
  unreadCount: number
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ users, socket, totalUnread = 0, onOpenChat }) => {
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const [showMessages, setShowMessages] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      if (socket) socket.disconnect()
      await logout()
      setShowLogoutConfirm(false)
      setShowToast(true)
      setTimeout(() => router.push('/login'), 1000)
    } finally {
      setLoggingOut(false)
    }
  }

  const fetchConversations = async () => {
    if (!user?.id) return
    setLoadingConvs(true)
    try {
      const response = await axiosInstance.get(`/messages/conversations/${user.id}`)
      setConversations(Array.isArray(response.data) ? response.data : [])
    } catch {
      // silently fail
    } finally {
      setLoadingConvs(false)
    }
  }

  useEffect(() => {
    if (showMessages) fetchConversations()
  }, [showMessages, totalUnread])

  useEffect(() => {
    if (!socket) return
    const handler = () => { if (showMessages) fetchConversations() }
    socket.on('new_private_message', handler)
    return () => { socket.off('new_private_message', handler) }
  }, [socket, showMessages])

  useEffect(() => {
    if (!showMessages) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowMessages(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMessages])

  const handleOpenConversation = (conv: Conversation) => {
    if (!conv.user || !onOpenChat) return
    onOpenChat({ _id: conv.user._id, username: conv.user.username, avatarUrl: conv.user.avatarUrl, sexe: conv.user.sexe })
    setShowMessages(false)
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
  }

  return (
    <>
      <header
        className="sticky top-0 z-[200] px-3 md:px-6 py-3"
        style={{
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-default)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between gap-3">

          {/* ── Logo ── */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="relative w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 2px 8px var(--accent-glow)',
              }}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="8" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="16" cy="12" r="1.5" />
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1
                className="text-xl font-bold leading-tight"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
              >
                BabiChat
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Discussion en temps réel
              </p>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">

            {/* Private messages */}
            <div className="relative" ref={panelRef}>
              <button
                onClick={() => setShowMessages(v => !v)}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all focus:outline-none"
                style={{
                  background: showMessages ? 'var(--accent-dim)' : 'var(--bg-surface)',
                  border: `1px solid ${showMessages ? 'var(--accent)' : 'var(--border-default)'}`,
                  color: showMessages ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                title="Messages privés"
                aria-label="Messages privés"
                aria-expanded={showMessages}
              >
                <MessageSquare className="w-4 h-4" />
                {totalUnread > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ background: 'var(--danger)', fontFamily: 'var(--font-ui)' }}
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>

              {/* Conversations dropdown */}
              {showMessages && (
                <div
                  className="absolute top-full right-0 mt-2 w-80 rounded-2xl overflow-hidden animate-scale-in-origin"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                    zIndex: 300,
                    transformOrigin: 'top right',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <h3
                      className="font-semibold text-sm"
                      style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
                    >
                      Messages privés
                    </h3>
                    {totalUnread > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: 'rgba(248,113,113,0.12)',
                          color: 'var(--danger)',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {loadingConvs ? (
                      <div className="p-6 flex justify-center">
                        <div
                          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                        />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div
                        className="p-8 text-center text-sm"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Aucune conversation
                      </div>
                    ) : (
                      conversations.map((conv, index) => {
                        if (!conv.user) return null
                        const isFromMe = conv.lastMessage?.sender?._id === user?.id
                        const hasUnread = conv.unreadCount > 0
                        return (
                          <div
                            key={conv.user._id || index}
                            onClick={() => handleOpenConversation(conv)}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <div className="relative flex-shrink-0">
                              <GenderAvatar
                                username={conv.user.username}
                                avatarUrl={conv.user.avatarUrl}
                                sexe={conv.user.sexe}
                                size="md"
                                className="w-10 h-10 rounded-xl"
                                clickable={false}
                              />
                              {hasUnread && (
                                <span
                                  className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 text-[10px] font-bold text-white"
                                  style={{ background: 'var(--danger)' }}
                                >
                                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{
                                    fontFamily: 'var(--font-ui)',
                                    color: hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontWeight: hasUnread ? '600' : '500',
                                  }}
                                >
                                  {conv.user.username}
                                </p>
                                <span
                                  className="text-[10px] flex-shrink-0"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {formatTime(conv.lastMessage?.createdAt)}
                                </span>
                              </div>
                              <p
                                className="text-xs truncate mt-0.5"
                                style={{
                                  color: hasUnread ? 'var(--text-secondary)' : 'var(--text-muted)',
                                  fontWeight: hasUnread ? '500' : '400',
                                }}
                              >
                                {isFromMe && <span style={{ color: 'var(--text-muted)' }}>Vous: </span>}
                                {conv.lastMessage?.content || '📎 Image'}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {conversations.length > 0 && (
                    <div
                      className="px-4 py-2 text-center text-xs"
                      style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
                    >
                      {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 rounded-xl px-2 md:px-3 py-1.5 transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
            >
              <GenderAvatar
                username={user?.username || ''}
                avatarUrl={user?.avatarUrl}
                sexe={user?.sexe}
                size="sm"
                className="w-7 h-7 md:w-8 md:h-8 rounded-lg"
                clickable={false}
              />
              <div className="hidden sm:block text-left">
                <p
                  className="text-xs md:text-sm font-semibold leading-tight truncate max-w-[96px]"
                  style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
                >
                  {users?.username || user?.username}
                </p>
                <div className="flex items-center gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
                    style={{ background: 'var(--online)' }}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>En ligne</span>
                </div>
              </div>
            </button>

            {/* Admin */}
            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
                title="Dashboard Admin"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
                }}
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            {/* Theme */}
            <ThemeToggle variant="inline" />

            {/* Logout */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
              title="Se déconnecter"
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !loggingOut) setShowLogoutConfirm(false) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            }}
          >
            {/* Icon */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}
              >
                <LogOut className="w-6 h-6" style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
                  Se déconnecter ?
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Vous serez redirigé vers la page de connexion.
                </p>
              </div>
            </div>

            {/* User card */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <GenderAvatar
                username={user?.username || ''}
                avatarUrl={user?.avatarUrl}
                sexe={user?.sexe}
                size="sm"
                className="w-9 h-9 rounded-lg flex-shrink-0"
                clickable={false}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
                  {user?.username}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {user?.email || (user?.isAnonymous ? 'Compte anonyme' : '')}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--online)' }} />
                <span className="text-xs" style={{ color: 'var(--online)' }}>En ligne</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--danger)' }}
              >
                {loggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Déconnexion…</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Déconnecter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <Toast message="Déconnexion réussie" type="success" onClose={() => setShowToast(false)} />
      )}
    </>
  )
}

export default ChatHeader
