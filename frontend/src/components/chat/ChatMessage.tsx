import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import UserSelectedModal from '../UserSelected/UserSelectedModal';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  createdAt: string;
}

interface ChatMessagesProps {
  currentRoom: string;
  socket: Socket | null;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ currentRoom, socket }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Message['sender'] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentRoom) return;

    axiosInstance
      .get(`/messages/${currentRoom}`)
      .then((res) => setMessages(res.data))
      .catch(() => console.error('Failed to load messages'));
  }, [currentRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      if (message && message.content && message.sender) {
        setMessages((prev) => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          const newMessages = [...prev, message];
          return newMessages.length > 1000 ? newMessages.slice(-500) : newMessages;
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageColor = (isOwnMessage: boolean) => {
    if (isOwnMessage) {
      return 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white';
    }
    return 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header du salon */}
      <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-xl p-3 mb-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-xl">💬</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">#{currentRoom}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {messages.length} message{messages.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isOwnMessage = msg.sender._id === user?.id;

            return (
              <div
                key={msg._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              >
                <div className="max-w-xs sm:max-w-md">
                  {/* Avatar et nom (pour les autres utilisateurs) */}
                  {!isOwnMessage && (
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-turquoise-500 to-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {msg.sender.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {msg.sender.username}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedUser(msg.sender)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded transition-all"
                        title="Message privé"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Bulle de message */}
                  <div
                    className={`rounded-2xl p-3 shadow-sm ${getMessageColor(isOwnMessage)} ${
                      isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md'
                    }`}
                  >
                    <div className="text-sm leading-relaxed break-words">
                      {msg.content}
                    </div>
                    
                    {/* Heure pour ses propres messages */}
                    {isOwnMessage && (
                      <div className="text-xs text-white/70 mt-1 text-right">
                        {formatTime(msg.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Bienvenue dans #{currentRoom}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Soyez le premier à envoyer un message !
            </p>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
      
      {selectedUser && (
        <UserSelectedModal
          userId={selectedUser._id}
          socket={socket}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default ChatMessages;