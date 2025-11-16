'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

interface AIAgent {
  id: string
  name: string
  avatar: string
}

interface Message {
  _id: string
  content: string
  sender: { _id: string; username: string }
  createdAt: string
  isAI?: boolean
}

interface AIAgentChatBoxProps {
  agent: AIAgent
  socket: any
  onClose: () => void
}

const AIAgentChatBox: React.FC<AIAgentChatBoxProps> = ({ agent, socket, onClose }) => {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const welcomeMessages = {
      alex: "Salut ! Moi c'est Alex 😊 Ravi de te rencontrer ! Comment ça va aujourd'hui ?",
      emma: "Coucou ! Je suis Emma 🌸 Contente de faire ta connaissance ! Tu vas bien ?"
    }
    
    const welcomeMessage: Message = {
      _id: 'welcome',
      content: welcomeMessages[agent.id as keyof typeof welcomeMessages] || `Salut ! Je suis ${agent.name} ! Comment ça va ?`,
      sender: { _id: `ai_${agent.id}`, username: agent.name },
      createdAt: new Date().toISOString(),
      isAI: true
    }
    setMessages([welcomeMessage])
  }, [agent])

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user?.id) return

    const userMessage: Message = {
      _id: Date.now().toString(),
      content: newMessage.trim(),
      sender: { _id: user.id, username: user.username },
      createdAt: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setNewMessage('')
    setIsTyping(true)
    scrollToBottom()

    setTimeout(async () => {
      try {
        const response = await fetch('/api/ai-agents/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage.content,
            agentId: agent.id,
            context: messages.slice(-3).map(msg => ({
              role: msg.isAI ? 'assistant' : 'user',
              content: msg.content
            }))
          })
        })

        const data = await response.json()
        
        const aiMessage: Message = {
          _id: (Date.now() + 1).toString(),
          content: data.response || "Désolé, je n'ai pas pu traiter ta demande.",
          sender: { _id: `ai_${agent.id}`, username: agent.name },
          createdAt: new Date().toISOString(),
          isAI: true
        }

        setMessages(prev => [...prev, aiMessage])
        setIsTyping(false)
        scrollToBottom()
      } catch (error) {
        console.error('Erreur:', error)
        setIsTyping(false)
      }
    }, 1000 + Math.random() * 1500)
  }

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="fixed bottom-20 right-6 z-[9999]">
          <EmojiPicker onEmojiClick={(emojiObject: EmojiClickData) => {
            setNewMessage(prev => prev + emojiObject.emoji)
            setShowEmojiPicker(false)
          }} />
        </div>
      )}
      
      <div className="fixed bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-2xl z-50 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl border-2 border-white/30">
              {agent.avatar}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <div className="font-medium text-sm">{agent.name}</div>
            <div className="flex items-center space-x-1 text-xs opacity-90">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>En ligne</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white text-xl font-bold">×</button>
      </div>

      <div className="h-80 max-h-[60vh] overflow-y-auto p-3 space-y-2">
        {messages.map((message) => {
          const isOwn = message.sender._id === user?.id
          const isAI = message.isAI || message.sender._id.startsWith('ai_')
          return (
            <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm break-words ${
                isAI
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-bl-md'
                  : isOwn 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md' 
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md shadow-sm'
              }`}>
                {message.content}
                <div className={`text-xs mt-2 ${isAI ? 'text-purple-100' : isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce delay-100"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-600 p-3 flex space-x-2">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Ajouter un emoji"
        >
          😊
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Écris à ${agent.name}...`}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="Envoyer le message"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
      </div>
    </div>
  )
}

export default AIAgentChatBox