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
      
      <div className="fixed bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl z-50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-3 flex items-center justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
        <div className="flex items-center space-x-3 relative z-10">
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl border-2 border-white/40 shadow-lg backdrop-blur-sm">
              {agent.avatar}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-bounce shadow-lg">
              <div className="w-full h-full bg-green-300 rounded-full animate-ping"></div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-base">{agent.name}</div>
            <div className="flex items-center space-x-2 text-xs opacity-90">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Assistant IA</span>
              </div>
              <span className="text-white/60">•</span>
              <span className="text-white/80">Réponse rapide</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-white/70 hover:text-white hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 relative z-10"
          title="Fermer la conversation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="h-80 max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50">
        {messages.map((message, index) => {
          const isOwn = message.sender._id === user?.id
          const isAI = message.isAI || message.sender._id.startsWith('ai_')
          return (
            <div 
              key={message._id} 
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm break-words shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${
                isAI
                  ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-bl-sm border border-blue-400/30'
                  : isOwn 
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-sm border border-indigo-400/30' 
                  : 'bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-600/50 rounded-bl-sm backdrop-blur-sm'
              }`}>
                <div className="relative">
                  {isAI && (
                    <div className="flex items-center space-x-2 mb-2 text-xs opacity-80">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                      <span>Assistant IA</span>
                    </div>
                  )}
                  <div className="leading-relaxed">{message.content}</div>
                  <div className={`text-xs mt-2 flex items-center justify-between ${
                    isAI ? 'text-white/70' : isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isOwn && (
                      <svg className="w-3 h-3 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        
        {isTyping && (
          <div className="flex justify-start animate-in slide-in-from-left-2 duration-300">
            <div className="max-w-[85%] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg border border-blue-400/30">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-white/70">En train d'écrire...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex space-x-3 items-end">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-300 p-3 rounded-xl text-lg hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-200 hover:scale-110 active:scale-95 shadow-md ${
              showEmojiPicker ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            title="Ajouter un emoji"
          >
            😊
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`💬 Écris à ${agent.name}...`}
              className="w-full border border-gray-300/50 dark:border-gray-600/50 rounded-xl px-4 py-3 text-sm bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm backdrop-blur-sm"
              maxLength={500}
            />
            <div className="absolute right-3 bottom-1 text-xs text-gray-400">
              {newMessage.length}/500
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white p-3 rounded-xl transition-all duration-200 shadow-lg ${
              newMessage.trim() 
                ? 'hover:scale-110 active:scale-95 hover:shadow-xl' 
                : 'opacity-50 cursor-not-allowed'
            }`}
            title="Envoyer le message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}

export default AIAgentChatBox