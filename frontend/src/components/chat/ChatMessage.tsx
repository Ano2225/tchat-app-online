import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import UserSelectedModal from '../UserSelected/UserSelectedModal';
import MessageReactions from './MessageReactions';
import GameMessage from '../Game/GameMessage';
import toast from 'react-hot-toast';

interface Reaction {
  emoji: string;
  users: { id: string; username: string }[];
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
  const [gameMessages, setGameMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<Message['sender'] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentRoom) return;

    // Si c'est le canal Game, rejoindre automatiquement le canal de jeu
    if (currentRoom === 'Game' && socket) {
      socket.emit('join_game_channel', currentRoom);
    }

    axiosInstance
      .get(`/messages/${currentRoom}`)
      .then((res) => setMessages(res.data))
      .catch((error) => {
        console.error('Failed to load messages:', error?.message || 'Unknown error');
      });
  }, [currentRoom, socket]);

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
      console.log('🎉 Reaction updated received:', { messageId, reactions, reactionsCount: reactions?.length || 0 });
      setMessages((prev) => {
        const updated = prev.map(msg => {
          if (msg._id === messageId) {
            console.log('📝 Updating message:', msg._id, 'old reactions:', msg.reactions, 'new reactions:', reactions);
            return { ...msg, reactions: reactions || [] };
          }
          return msg;
        });
        return updated;
      });
    };

    const handleGameMessage = (gameMessage: any) => {
      setGameMessages((prev) => [...prev, { ...gameMessage, id: Date.now() }]);
      setTimeout(() => {
        setGameMessages((prev) => prev.filter(msg => msg.id !== gameMessage.id));
      }, 10000); // Supprimer après 10 secondes
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('game_message', handleGameMessage);
    
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('game_message', handleGameMessage);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getMessageColor = (isOwnMessage: boolean) => {
    if (isOwnMessage) {
      return 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white';
    }
    return 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white';
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!socket || !user?.id) {
      console.log('Cannot add reaction: missing socket or user', { socket: !!socket, userId: user?.id });
      return;
    }
    
    console.log('Emitting add_reaction:', { messageId, emoji, userId: user.id, room: currentRoom });
    socket.emit('add_reaction', {
      messageId,
      emoji,
      userId: user.id,
      room: currentRoom
    });
  };


  const handleReply = (message: Message) => {
    if (onReply) {
      onReply(message);
    }
  };


  
  // Nettoyer la connexion au canal de jeu lors du changement de canal
  useEffect(() => {
    return () => {
      if (currentRoom === 'Game' && socket) {
        socket.emit('leave_game_channel', currentRoom);
      }
    };
  }, [currentRoom, socket]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header du canal */}
      <div className="bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-700 to-gray-600 dark:from-primary-500 dark:to-secondary-500 rounded-full flex items-center justify-center shadow-sm">
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

      {/* Messages de jeu */}
      {gameMessages.map((gameMsg) => (
        <GameMessage 
          key={gameMsg.id} 
          content={gameMsg.content || gameMsg.data?.content || ''} 
          timestamp={gameMsg.timestamp || new Date().toISOString()} 
        />
      ))}

      {/* Messages */}
      {messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isOwnMessage = msg.sender._id === user?.id;
            const isQuizBot = msg.sender.username === 'Quiz Bot';

            // Afficher les messages du Quiz Bot avec le composant GameMessage
            if (isQuizBot) {
              return (
                <GameMessage
                  key={msg._id}
                  content={msg.content}
                  timestamp={msg.createdAt}
                />
              );
            }

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
                        <button
                          onClick={() => {
                            console.log('Clicked on user:', msg.sender);
                            if (msg.sender._id !== user?.id) {
                              setSelectedUser(msg.sender);
                            }
                          }}
                          className="w-8 h-8 bg-gradient-to-r from-gray-700 to-gray-600 dark:from-turquoise-500 dark:to-primary-500 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
                          title="Voir le profil"
                        >
                          <span className="text-sm font-bold text-white">
                            {msg.sender?.username?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </button>
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
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 group"
                          title="Répondre"
                        >
                          <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
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
                      className={`rounded-2xl p-3 ${getMessageColor(isOwnMessage)} ${
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
                        isOwn={isOwnMessage}
                        senderId={msg.sender._id}
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
      

    </div>
  );
};

export default ChatMessages;