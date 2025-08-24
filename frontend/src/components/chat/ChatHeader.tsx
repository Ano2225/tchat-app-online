'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Socket } from 'socket.io-client'
import axiosInstance from '@/utils/axiosInstance'
import PrivateChatBox from './PrivateChatBox'

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
  const user = useAuthStore((state) => state.user)

  const handleLogout = () => {
    if (socket) {
      socket.disconnect()
    }
    logout()
    router.push('/')
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
            
            <div className="flex items-center space-x-3 bg-gray-100 dark:bg-white/10 rounded-full px-4 py-2 border border-gray-200 dark:border-white/20">
              <div className="w-8 h-8 bg-gradient-to-r from-secondary-500 to-turquoise-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {users?.username?.charAt(0).toUpperCase()}
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
            </div>

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
    </>
  )
}

export default ChatHeader