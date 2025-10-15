import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import UserSelectedModal from '../UserSelected/UserSelectedModal';
import MessageReactions from './MessageReactions';
import MessageContextMenu from './MessageContextMenu';
import toast from 'react-hot-toast';

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  createdAt: string;
  replyTo?: Message;
  reactions?: Reaction[];
}

interface ChatMessagesProps {
  currentRoom: string;
  socket: Socket | null;
  onReply?: (message: Message) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ currentRoom, socket, onReply }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Message['sender'] | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: Message; position: { x: number; y: number } } | null>(null);
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

    const handleReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages((prev) => 
        prev.map(msg => 
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('reaction_updated', handleReactionUpdated);
    
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('reaction_updated', handleReactionUpdated);
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

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!socket || !user?.id) return;
    
    socket.emit('add_reaction', {
      messageId,
      emoji,
      userId: user.id,
      room: currentRoom
    });
  };

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({
      message,
      position: { x: e.clientX, y: e.clientY }
    });
  };



  const handleReply = (message: Message) => {
    if (onReply) {
      onReply(message);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking on the context menu itself or on a modal
      const target = e.target as Element;
      if (target.closest('[data-context-menu]') || 
          target.closest('.fixed.inset-0') || 
          target.closest('[role="dialog"]')) return;
      setContextMenu(null);
    };
    
    if (contextMenu) {
      // Add delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header du canal */}
      <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">#</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{currentRoom}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Canal public • {messages.length} message{messages.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">En ligne</span>
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
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors`}
              >
                <div className="max-w-xs sm:max-w-md w-full">
                  {/* Avatar et nom (pour les autres utilisateurs) */}
                  {!isOwnMessage && (
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-turquoise-500 to-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {msg.sender?.username?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {msg.sender?.username || 'Utilisateur inconnu'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleReply(msg)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded transition-all"
                          title="Répondre"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSelectedUser(msg.sender)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded transition-all"
                          title="Message privé"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Setting context menu:', msg);
                            setContextMenu({
                              message: msg,
                              position: { x: e.clientX, y: e.clientY }
                            });
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded transition-all"
                          title="Plus d'options"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message de réponse */}
                  {msg.replyTo && msg.replyTo.sender && (
                    <div className="mb-2 ml-10 p-2 bg-gray-100 dark:bg-white/10 rounded-lg border-l-2 border-primary-500">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Réponse à {msg.replyTo.sender.username}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {msg.replyTo.content}
                      </div>
                    </div>
                  )}

                  {/* Bulle de message */}
                  <div className={`${!isOwnMessage ? 'ml-10' : ''}`}>
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

                    {/* Réactions */}
                    <div className={`${!isOwnMessage ? '' : 'flex justify-end'}`}>
                      <MessageReactions
                        messageId={msg._id}
                        reactions={msg.reactions || []}
                        onAddReaction={handleAddReaction}
                      />
                    </div>
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
      
      {contextMenu && (
        <>
          {console.log('Rendering context menu:', contextMenu)}
          <MessageContextMenu
            message={contextMenu.message}
            onReply={handleReply}
            onClose={() => setContextMenu(null)}
            position={contextMenu.position}
          />
        </>
      )}
    </div>
  );
};

export default ChatMessages;