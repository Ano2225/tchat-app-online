'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Socket } from 'socket.io-client'
import axiosInstance from '@/utils/axiosInstance'
import PrivateChatBox from './PrivateChatBox'
import Toast from '../ui/Toast'
import ThemeToggle from '../ui/ThemeToggle'
import ProfileModal from '../profile/ProfileModal'

interface ChatHeaderProps {
  users?: {
    id: string
    username: string
  }
  socket: Socket | null
}

interface Conversation {
  _id: string
  user: {
    _id: string
    username: string
    email: string
  }
  lastMessage?: {
    content: string
    createdAt: string
  }
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ users, socket }) => {
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const [showMessages, setShowMessages] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<{_id: string, username: string} | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const user = useAuthStore((state) => state.user)

  const handleLogout = () => {
    if (socket) {
      socket.disconnect()
    }
    logout()
    setShowToast(true)
    setTimeout(() => {
      router.push('/')
    }, 1000)
  }

  const fetchConversations = async () => {
    if (!user?.id) return
    
    try {
      const response = await axiosInstance.get(`/messages/conversations/${user.id}`)
      setConversations(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error)
    }
  }

  useEffect(() => {
    if (showMessages && user?.id) {
      fetchConversations()
    }
  }, [showMessages, user?.id])

  useEffect(() => {
    if (!socket || !user?.id) return

    const handleNewMessage = (message: any) => {
      // Ne compter que les messages reçus (pas envoyés)
      if (message.sender?._id !== user.id) {
        setUnreadCount(prev => prev + 1)
      }
      if (showMessages) {
        fetchConversations()
      }
    }

    const handleNotification = (notification: any) => {
      // Notification = message reçu
      setUnreadCount(prev => prev + 1)
      if (showMessages) {
        fetchConversations()
      }
    }

    socket.on('receive_private_message', handleNewMessage)
    socket.on('notify_user', handleNotification)

    return () => {
      socket.off('receive_private_message', handleNewMessage)
      socket.off('notify_user', handleNotification)
    }
  }, [socket, showMessages, user?.id])

  return (
    <>
      <header className="sticky top-0 bg-white/80 dark:bg-white/10 backdrop-blur-xl border-b border-gray-200 dark:border-white/20 px-6 py-4 shadow-lg z-[200]">
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">TChat</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Chat civilisé</p>
            </div>
          </div>

          {/* Utilisateur connecté */}
          <div className="flex items-center space-x-4">
            {/* Bouton Messages privés */}
            <button
              onClick={() => {
                setShowMessages(!showMessages)
                if (!showMessages) setUnreadCount(0)
              }}
              className="p-2 bg-turquoise-500/10 hover:bg-turquoise-500/20 border border-turquoise-500/20 rounded-xl transition-all duration-200 relative"
              title="Messages privés"
            >
              <svg className="w-5 h-5 text-turquoise-600 dark:text-turquoise-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[12px] h-3 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </div>
              )}
            </button>
            
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center space-x-3 bg-gray-100 dark:bg-white/10 rounded-full px-4 py-2 border border-gray-200 dark:border-white/20 hover:bg-gray-200 dark:hover:bg-white/20 transition-all cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user?.bgColor || 'bg-gradient-to-r from-secondary-500 to-turquoise-500'}`}>
                <span className="text-sm font-bold text-white">
                  {user?.avatarUrl || users?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {users?.username}
                </p>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">En ligne</span>
                </div>
              </div>
            </button>

            {/* Bouton Admin */}
            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all duration-200"
                title="Dashboard Admin"
              >
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            
            {/* Bouton thème */}
            <ThemeToggle variant="inline" />
            
            {/* Bouton déconnexion */}
            <button
              onClick={handleLogout}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all duration-200 group"
              title="Se déconnecter"
            >
              <svg 
                className="w-5 h-5 text-red-500 group-hover:text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Panel des messages privés */}
        {showMessages && (
          <div className="absolute top-full right-6 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[300]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Messages privés</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Aucune conversation
                  </p>
                </div>
              ) : (
                conversations.map((conversation, index) => {
                  if (!conversation.user) return null
                  
                  return (
                    <div 
                      key={conversation._id || index} 
                      onClick={() => {
                        setSelectedUser(conversation.user)
                        setShowMessages(false)
                      }}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {conversation.user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conversation.user.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {conversation.lastMessage?.content || 'Conversation'}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {conversation.lastMessage?.createdAt && 
                            new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                          }
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </header>
      
      {/* Chat privé - en dehors du header */}
      {selectedUser && (
        <PrivateChatBox 
          recipient={selectedUser} 
          socket={socket} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
      
      {/* Modal de profil */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
      
      {/* Toast de déconnexion */}
      {showToast && (
        <Toast 
          message="Déconnexion réussie" 
          type="success" 
          onClose={() => setShowToast(false)} 
        />
      )}
    </>
  )
}

export default ChatHeader