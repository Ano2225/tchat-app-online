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
  const panelRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    if (socket) socket.disconnect()
    logout()
    setShowToast(true)
    setTimeout(() => router.push('/'), 1000)
  }

  const fetchConversations = async () => {
    if (!user?.id) return
    setLoadingConvs(true)
    try {
      const response = await axiosInstance.get(`/messages/conversations/${user.id}`)
      setConversations(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Erreur chargement conversations:', error)
    } finally {
      setLoadingConvs(false)
    }
  }

  // Load conversations when panel opens or unread count changes
  useEffect(() => {
    if (showMessages) fetchConversations()
  }, [showMessages, totalUnread])

  // Refresh conversations on new private message
  useEffect(() => {
    if (!socket) return
    const handler = () => {
      if (showMessages) fetchConversations()
    }
    socket.on('new_private_message', handler)
    return () => { socket.off('new_private_message', handler) }
  }, [socket, showMessages])

  // Close panel on outside click
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
    onOpenChat({
      _id: conv.user._id,
      username: conv.user.username,
      avatarUrl: conv.user.avatarUrl,
      sexe: conv.user.sexe,
    })
    setShowMessages(false)
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
  }

  return (
    <>
      <header className="sticky top-0 bg-white/80 dark:bg-white/10 backdrop-blur-xl border-b border-gray-200 dark:border-white/20 px-3 md:px-6 py-3 md:py-4 z-[200]">
        <div className="flex items-center justify-between gap-2 md:gap-0">
          {/* Logo */}
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
            <div className="relative w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="8" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="16" cy="12" r="1.5" />
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-2xl" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">BabiChat</h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">Espace de discussion</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1.5 md:space-x-3 flex-shrink-0">

            {/* Messages privés */}
            <div className="relative" ref={panelRef}>
              <button
                onClick={() => setShowMessages(v => !v)}
                className="p-1.5 md:p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg md:rounded-xl transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Messages privés"
                aria-label="Messages privés"
                aria-expanded={showMessages}
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1 text-[10px] text-white font-bold">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>

              {/* Conversations dropdown */}
              {showMessages && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[300] overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Messages privés</h3>
                    {totalUnread > 0 && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                        {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {loadingConvs ? (
                      <div className="p-6 flex justify-center">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Aucune conversation
                      </div>
                    ) : (
                      conversations.map((conv, index) => {
                        if (!conv.user) return null
                        const isFromMe = conv.lastMessage?.sender?._id === user?.id
                        return (
                          <div
                            key={conv.user._id || index}
                            onClick={() => handleOpenConversation(conv)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors"
                          >
                            <div className="relative flex-shrink-0">
                              <GenderAvatar
                                username={conv.user.username}
                                avatarUrl={conv.user.avatarUrl}
                                sexe={conv.user.sexe}
                                size="md"
                                className="w-10 h-10"
                                clickable={false}
                              />
                              {conv.unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1 text-[10px] text-white font-bold">
                                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {conv.user.username}
                                </p>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                  {formatTime(conv.lastMessage?.createdAt)}
                                </span>
                              </div>
                              <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                {isFromMe && <span className="text-gray-400 mr-1">Vous:</span>}
                                {conv.lastMessage?.content || 'Image'}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {conversations.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-center">
                      <span className="text-xs text-gray-400">{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profil */}
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center space-x-2 bg-gray-100 dark:bg-white/10 rounded-full px-2 md:px-4 py-1.5 md:py-2 border border-gray-200 dark:border-white/20 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
            >
              <GenderAvatar
                username={user?.username || ''}
                avatarUrl={user?.avatarUrl}
                sexe={user?.sexe}
                size="sm"
                className="w-7 h-7 md:w-8 md:h-8"
                clickable={false}
              />
              <div className="hidden sm:block text-left">
                <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white leading-tight">
                  {users?.username || user?.username}
                </p>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">En ligne</span>
                </div>
              </div>
            </button>

            {/* Admin */}
            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="p-1.5 md:p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg md:rounded-xl transition-all"
                title="Dashboard Admin"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}

            {/* Thème */}
            <ThemeToggle variant="inline" />

            {/* Déconnexion */}
            <button
              onClick={handleLogout}
              className="p-1.5 md:p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg md:rounded-xl transition-all group"
              title="Se déconnecter"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 text-red-500 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {showToast && (
        <Toast message="Déconnexion réussie" type="success" onClose={() => setShowToast(false)} />
      )}
    </>
  )
}

export default ChatHeader
