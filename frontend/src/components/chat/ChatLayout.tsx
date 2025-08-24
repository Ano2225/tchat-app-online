'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Search, 
  Plus,
  Moon,
  Sun,
  Bell,
  Video,
  Phone
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface ChatLayoutProps {
  children: React.ReactNode
}

const ChatLayout = ({ children }: ChatLayoutProps) => {
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const channels = [
    { id: 1, name: 'Général', unread: 3, active: true },
    { id: 2, name: 'Développement', unread: 0, active: false },
    { id: 3, name: 'Design', unread: 1, active: false },
    { id: 4, name: 'Marketing', unread: 0, active: false },
  ]

  const onlineUsers = [
    { id: 1, name: 'Alice Martin', status: 'En ligne', avatar: '' },
    { id: 2, name: 'Bob Dupont', status: 'Absent', avatar: '' },
    { id: 3, name: 'Claire Moreau', status: 'En ligne', avatar: '' },
    { id: 4, name: 'David Bernard', status: 'Occupé', avatar: '' },
  ]

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-8 h-8 text-primary-500" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">TChat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDarkMode(!darkMode)}
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Avatar name={user?.username || 'User'} online size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.username || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">En ligne</p>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="p-4">
              <Input
                placeholder="Rechercher..."
                icon={<Search className="w-4 h-4" />}
                className="bg-gray-50 dark:bg-gray-700 border-0"
              />
            </div>

            {/* Channels */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Canaux
                  </h3>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-1">
                  {channels.map((channel) => (
                    <motion.div
                      key={channel.id}
                      whileHover={{ x: 4 }}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        channel.active
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">#</span>
                        <span className="text-sm font-medium">{channel.name}</span>
                      </div>
                      {channel.unread > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {channel.unread}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Online Users */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    En ligne ({onlineUsers.length})
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {onlineUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      whileHover={{ x: 4 }}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <Avatar 
                        name={user.name} 
                        online={user.status === 'En ligne'} 
                        size="sm" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.status}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Notifications</span>
                </div>
                <div className="w-8 h-4 bg-gray-200 dark:bg-gray-600 rounded-full relative">
                  <div className="w-4 h-4 bg-primary-500 rounded-full absolute right-0 transition-all"></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle Sidebar Button */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            <Users className="w-4 h-4" />
          </Button>
        </div>
        
        {children}
      </div>
    </div>
  )
}

export default ChatLayout