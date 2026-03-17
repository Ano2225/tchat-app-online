import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import UserSelectedModal from '../UserSelected/UserSelectedModal';
import MessageReactions from './MessageReactions';
import GameMessage from '../Game/GameMessage';
import { ChatSkeleton } from '@/components/ui/skeletons';
import toast from 'react-hot-toast';
import GenderAvatar from '@/components/ui/GenderAvatar';
import { MessageCircle } from 'lucide-react';

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
    avatarUrl?: string;
    sexe?: string;
  };
  content: string;
  createdAt: string;
  room?: string;
  replyTo?: Message;
  reactions?: Reaction[];
  isGameMessage?: boolean;
}

interface GameMessage {
  id: string;
  content?: string;
  data?: { content?: string };
  timestamp?: string;
}

interface ChatMessagesProps {
  currentRoom: string;
  socket: Socket | null;
  onReply?: (message: Message) => void;
}

const PAGE_SIZE = 50;

const ChatMessages: React.FC<ChatMessagesProps> = ({ currentRoom, socket, onReply }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<Message['sender'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const isGameChannel = currentRoom === 'Game';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (room: string) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/messages/${room}?limit=${PAGE_SIZE}`);
      const data: Message[] = res.data;
      setMessages(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load messages:', msg);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0].createdAt;
      const res = await axiosInstance.get(`/messages/${currentRoom}?limit=${PAGE_SIZE}&before=${encodeURIComponent(oldest)}`);
      const older: Message[] = res.data;
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === PAGE_SIZE);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load older messages:', msg);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!currentRoom) return;
    loadMessages(currentRoom);
    if (!isGameChannel) setGameMessages([]);
  }, [currentRoom, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      if (!message || (!message.content && !message.isGameMessage)) return;
      // Ensure sender always has a usable shape (anonymous users may lack a DB record)
      if (!message.sender) {
        (message as Message).sender = { _id: 'unknown', username: 'Anonyme' };
      }
      setMessages((prev) => {
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        const newMessages = [...prev, message];
        return newMessages.length > 1000 ? newMessages.slice(-500) : newMessages;
      });
    };

    const handleReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages((prev) =>
        prev.map(msg => msg._id === messageId ? { ...msg, reactions: reactions || [] } : msg)
      );
    };

    const handleGameMessage = (gameMessage: Omit<GameMessage, 'id'>) => {
      if (!isGameChannel) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setGameMessages((prev) => [...prev, { ...gameMessage, id }].slice(-3));
      setTimeout(() => {
        setGameMessages((prev) => prev.filter(msg => msg.id !== id));
      }, 8000); // Supprimer après 8 secondes
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('game_message', handleGameMessage);
    
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('game_message', handleGameMessage);
    };
  }, [socket, isGameChannel]);

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

  const getMessageColor = (isOwnMessage: boolean, sexe?: string) => {
    if (isOwnMessage) {
      return 'text-white';
    }
    if (sexe === 'homme') {
      return 'bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white border border-blue-100 dark:border-blue-800/50';
    }
    if (sexe === 'femme') {
      return 'bg-pink-50 dark:bg-pink-900/30 text-gray-900 dark:text-white border border-pink-100 dark:border-pink-800/50';
    }
    return 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white';
  };

  const getNameColor = (sexe?: string) => {
    if (sexe === 'homme') return 'text-blue-600 dark:text-blue-400';
    if (sexe === 'femme') return 'text-pink-600 dark:text-pink-400';
    return 'text-gray-900 dark:text-white';
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


  
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottomSmooth = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const channelSubtitle = isGameChannel
    ? 'Quiz en temps réel • Répondez directement dans le chat'
    : `Canal public • ${messages.length} message${messages.length > 1 ? 's' : ''}`;

  return (
    <div 
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 relative"
    >
      {/* Header du canal */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900/95 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl p-3 md:p-4 mb-3 md:mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
              <span className="font-bold text-sm md:text-base" style={{ color: 'var(--accent)' }}>#</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg truncate">{currentRoom}</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">
                {channelSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 md:space-x-2 flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">En ligne</span>
          </div>
        </div>
      </div>

      {/* Messages de jeu */}
      {isGameChannel && gameMessages.map((gameMsg) => (
        <GameMessage
          key={gameMsg.id}
          content={gameMsg.content || gameMsg.data?.content || ''}
          timestamp={gameMsg.timestamp || new Date().toISOString()}
        />
      ))}

      {/* Scroll to bottom button — portal to avoid overflow/transform clipping */}
      {showScrollButton && typeof document !== 'undefined' && createPortal(
        <button
          onClick={scrollToBottomSmooth}
          className="w-10 h-10 md:w-12 md:h-12 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none"
          style={{ position: 'fixed', bottom: '96px', right: '32px', zIndex: 9000, background: 'var(--accent)' }}
          aria-label="Scroll to bottom"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>,
        document.body
      )}

      {/* Messages */}
      {loading ? (
        <ChatSkeleton count={6} />
      ) : messages.length > 0 ? (
        <div className="space-y-2 md:space-y-3">
          {/* Load previous messages */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadMoreMessages}
                disabled={loadingMore}
                aria-label="Charger les messages précédents"
                className="text-xs text-primary-500 hover:text-primary-600 disabled:opacity-50 px-4 py-1.5 border border-primary-300 dark:border-primary-700 rounded-full transition-colors"
              >
                {loadingMore ? 'Chargement…' : 'Charger les messages précédents'}
              </button>
            </div>
          )}
          {messages.map((msg) => {
            const sender = msg.sender || null;
            const senderId = sender?._id;
            const senderName = sender?.username || 'Utilisateur inconnu';
            const isOwnMessage = !!senderId && senderId === user?.id;
            const isQuizBot = senderName === 'Quiz Bot';

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
                        <GenderAvatar
                          username={senderName}
                          avatarUrl={sender?.avatarUrl}
                          sexe={sender?.sexe}
                          size="md"
                          onClick={() => {
                            console.log('Clicked on user:', msg.sender);
                            if (sender && senderId !== user?.id) {
                              setSelectedUser(sender);
                            }
                          }}
                        />
                        <span className={`text-sm font-semibold ${getNameColor(sender?.sexe)}`}>
                          {senderName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleReply(msg)}
                          aria-label={`Répondre à ${senderName}`}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 group"
                        >
                          <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message de réponse */}
                  {msg.replyTo && (
                    <div className="mb-2 ml-10 p-2 bg-gray-100 dark:bg-white/10 rounded-lg border-l-2 border-primary-500">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Réponse à {msg.replyTo.sender?.username || 'Utilisateur inconnu'}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {msg.replyTo.content || 'Message original indisponible'}
                      </div>
                    </div>
                  )}

                  {/* Bulle de message */}
                  <div className={`${!isOwnMessage ? 'ml-10' : ''}`}>
                    <div
                      className={`rounded-2xl p-3 ${getMessageColor(isOwnMessage, sender?.sexe)} ${
                        isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md'
                      }`}
                      style={isOwnMessage ? { background: 'var(--accent)' } : undefined}
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
                        senderId={senderId}
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
              <MessageCircle className="w-8 h-8 text-gray-500 dark:text-gray-400" />
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
