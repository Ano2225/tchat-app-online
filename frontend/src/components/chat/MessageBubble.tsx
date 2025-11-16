'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MoreVertical, Reply, Heart, Copy, Trash2, Edit3 } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import AICharacterAvatar from './AICharacterAvatar'
import MessageReactions from './MessageReactions'
import { formatTime } from '@/lib/utils'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

interface Message {
  id: string
  content: string
  sender: {
    id: string
    username: string
    avatar?: string
    avatarUrl?: string
  }
  timestamp: Date | string
  isOwn: boolean
  isAI?: boolean
  aiCharacter?: string
  type?: 'text' | 'image' | 'file'
  reactions?: { emoji: string; count: number; users: { id: string; username: string }[] }[]
  replyTo?: {
    id: string
    content: string
    sender: string
  }
}

interface MessageBubbleProps {
  message: Message
  onReply?: (message: Message) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
}

const MessageBubble = ({ message, onReply, onEdit, onDelete, onReact }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const reactions = ['❤️', '👍', '😂', '😮', '😢', '😡']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 group relative ${
        message.isOwn ? 'flex-row-reverse space-x-reverse' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!message.isOwn && (
        message.isAI ? (
          <AICharacterAvatar 
            character={message.sender.avatarUrl || message.sender.avatar}
            name={message.sender.username}
            size="md"
          />
        ) : (
          <Avatar name={message.sender.username} src={message.sender.avatar} size="md" />
        )
      )}

      <div className={`flex-1 max-w-2xl ${message.isOwn ? 'flex flex-col items-end' : ''}`}>
        {/* Reply Context */}
        {message.replyTo && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-primary-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Réponse à {message.replyTo.sender}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {/* Message Header */}
        <div className={`flex items-center space-x-2 mb-1 ${message.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {message.sender.username}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message Content */}
        <div
          className={`relative p-3 rounded-2xl max-w-md break-words ${
            message.isAI
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-bl-md border-2 border-purple-300'
              : message.isOwn
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
          }`}
        >
          {message.type === 'image' ? (
            <img
              src={message.content}
              alt="Image partagée"
              className="rounded-lg max-w-full h-auto"
            />
          ) : (
            <p className="text-sm leading-relaxed">{message.content}</p>
          )}

          {/* Message Actions */}
          <Transition
            show={showActions}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <div className={`absolute top-0 flex items-center space-x-1 ${
              message.isOwn ? '-left-20' : '-right-20'
            }`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-1 flex items-center space-x-1">
                {['❤️', '👍', '😂'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReact?.(message.id, emoji)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm transition-all hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
                
                <Menu as="div" className="relative">
                  <Menu.Button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </Menu.Button>
                  
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 focus:outline-none z-10">
                      <div className="p-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => onReply?.(message)}
                              className={`${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              } flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md`}
                            >
                              <Reply className="w-4 h-4" />
                              <span>Répondre</span>
                            </button>
                          )}
                        </Menu.Item>
                        
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleCopy}
                              className={`${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              } flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md`}
                            >
                              <Copy className="w-4 h-4" />
                              <span>Copier</span>
                            </button>
                          )}
                        </Menu.Item>

                        {message.isOwn && !message.isAI && (
                          <>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => onEdit?.(message.id)}
                                  className={`${
                                    active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                  } flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                  <span>Modifier</span>
                                </button>
                              )}
                            </Menu.Item>
                            
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => onDelete?.(message.id)}
                                  className={`${
                                    active ? 'bg-red-100 dark:bg-red-900' : ''
                                  } flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-md`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Supprimer</span>
                                </button>
                              )}
                            </Menu.Item>
                          </>
                        )}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </Transition>
        </div>

        {/* Reactions */}
        <MessageReactions
          messageId={message.id}
          reactions={message.reactions || []}
          onAddReaction={onReact || (() => {})}
          isOwn={message.isOwn}
          senderId={message.sender.id}
        />
      </div>

      {message.isOwn && (
        <Avatar name={message.sender.username} src={message.sender.avatar} size="md" />
      )}
    </motion.div>
  )
}

export default MessageBubble