import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import UserSelectedModal from '../UserSelected/UserSelectedModal';
import MessageReactions from './MessageReactions';
import GameMessage from '../Game/GameMessage';
import { ChatSkeleton } from '@/components/ui/skeletons';
import GenderAvatar from '@/components/ui/GenderAvatar';
import AdminBadge from '@/components/ui/AdminBadge';
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
    role?: string;
    isBot?: boolean;
  };
  content: string;
  createdAt: string;
  room?: string;
  replyTo?: Message;
  reactions?: Reaction[];
  isGameMessage?: boolean;
  isAI?: boolean;
  aiCharacter?: string;
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

  const user = useAuthStore((state) => state.user);
  const isGameChannel = currentRoom === 'Game';

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    });
  };

  const getBubbleStyle = (isOwnMessage: boolean, sexe?: string): React.CSSProperties => {
    if (isOwnMessage) return { background: 'var(--accent)', color: '#fff' };
    if (sexe === 'homme') return { background: 'var(--bubble-m, #EFF6FF)', color: 'var(--text-primary)', border: '1px solid var(--bubble-m-border, #BFDBFE)' };
    if (sexe === 'femme') return { background: 'var(--bubble-f, #FDF2F8)', color: 'var(--text-primary)', border: '1px solid var(--bubble-f-border, #FBCFE8)' };
    return { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' };
  };

  const getNameColor = (sexe?: string) => {
    if (sexe === 'homme') return 'text-blue-600 dark:text-blue-400';
    if (sexe === 'femme') return 'text-pink-500 dark:text-pink-400';
    return 'text-gray-900 dark:text-white';
  };

  // Render message content with @mention highlighting
  const renderContent = (content: string, isOwn: boolean): React.ReactNode => {
    const myUsername = user?.username?.toLowerCase();
    const parts = content.split(/(@[a-zA-Z0-9_]{1,50})/g);
    return parts.map((part, i) => {
      if (!part.startsWith('@')) return part;
      const mentioned = part.slice(1).toLowerCase();
      const isMe = mentioned === myUsername;
      return (
        <span
          key={i}
          style={{
            fontWeight: 700,
            borderRadius: '4px',
            padding: '0 3px',
            background: isMe
              ? isOwn ? 'rgba(255,255,255,0.25)' : 'var(--accent-dim)'
              : isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-elevated)',
            color: isMe
              ? isOwn ? '#fff' : 'var(--accent)'
              : isOwn ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
          }}
        >
          {part}
        </span>
      );
    });
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
      className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 md:px-3 md:py-3"
    >
      {/* Header du canal — compact */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 mb-2 rounded-xl"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>#</span>
        </div>
        <span className="text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
          {currentRoom}
        </span>
        <span className="text-xs ml-auto hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
          {channelSubtitle}
        </span>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--online)' }} aria-hidden="true" />
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
          className="w-10 h-10 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none hover:scale-105 active:scale-95"
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9000,
            background: 'var(--accent)',
            boxShadow: '0 4px 16px var(--accent-glow)',
          }}
          aria-label="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>,
        document.body
      )}

      {/* Messages */}
      {loading ? (
        <ChatSkeleton count={6} />
      ) : messages.length > 0 ? (
        <div className="space-y-0.5">
          {/* Load previous messages */}
          {hasMore && (
            <div className="flex justify-center py-2 mb-1">
              <button
                onClick={loadMoreMessages}
                disabled={loadingMore}
                aria-label="Charger les messages précédents"
                className="text-xs px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
              >
                {loadingMore ? 'Chargement…' : 'Charger les messages précédents'}
              </button>
            </div>
          )}
          {messages.map((msg, index) => {
            const sender = msg.sender || null;
            const senderId = sender?._id;
            const senderName = sender?.username || 'Utilisateur inconnu';
            const isOwnMessage = !!senderId && senderId === user?.id;
            const isQuizBot = senderName === 'Quiz Bot';

            if (isQuizBot) {
              return (
                <GameMessage
                  key={msg._id}
                  content={msg.content}
                  timestamp={msg.createdAt}
                />
              );
            }

            // Grouping: is this the first message of a consecutive block from this sender?
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            const prevSenderId = prevMsg?.sender?._id;
            const nextSenderId = nextMsg?.sender?._id;
            const isFirst = prevSenderId !== senderId || prevMsg?.sender?.username === 'Quiz Bot';
            const isLast = nextSenderId !== senderId || nextMsg?.sender?.username === 'Quiz Bot';

            // Tail shape: only on last bubble of a group
            const ownRadius = isLast ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl';
            const otherRadius = isLast ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl';

            return (
              <div
                key={msg._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'} group px-1`}
              >
                {/* Avatar placeholder to maintain alignment — only shown for first message of group */}
                {!isOwnMessage && (
                  <div className="w-7 flex-shrink-0 mr-1.5 self-end mb-0.5">
                    {isLast ? (
                      <GenderAvatar
                        username={senderName}
                        avatarUrl={sender?.avatarUrl}
                        sexe={sender?.sexe}
                        size="sm"
                        className="w-7 h-7 rounded-full"
                        onClick={() => {
                          if (sender && senderId !== user?.id) setSelectedUser(sender);
                        }}
                      />
                    ) : null}
                  </div>
                )}

                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
                  {/* Sender name + time — only on first bubble of group */}
                  {!isOwnMessage && isFirst && (
                    <div className="flex items-baseline gap-1.5 mb-0.5 ml-1">
                      <span
                        className={`text-xs font-semibold ${getNameColor(sender?.sexe)}`}
                        style={{ fontFamily: 'var(--font-ui)' }}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span>{senderName}</span>
                          {sender?.role === 'admin' && <AdminBadge className="flex-shrink-0" />}
                        </span>
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Reply context */}
                  {msg.replyTo && (
                    <div
                      className="mb-1 px-2.5 py-1.5 rounded-xl w-full"
                      style={{ background: 'var(--bg-surface)', borderLeft: '2px solid var(--accent)' }}
                    >
                      <div className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--accent)' }}>
                        ↩ {msg.replyTo.sender?.username || 'Inconnu'}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {msg.replyTo.content || '…'}
                      </div>
                    </div>
                  )}

                  {/* Bubble */}
                  <div className="relative flex items-end gap-1">
                    {/* Reply button — visible on hover desktop, always small on mobile */}
                    {!isOwnMessage && (
                      <button
                        onClick={() => handleReply(msg)}
                        aria-label="Répondre"
                        className="reply-btn opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full flex-shrink-0 order-first active:opacity-100"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    )}

                    <div
                      className={`px-3 py-1.5 text-sm leading-relaxed break-words ${isOwnMessage ? ownRadius : otherRadius}`}
                      style={getBubbleStyle(isOwnMessage, sender?.sexe)}
                    >
                      {renderContent(msg.content, isOwnMessage)}
                    </div>

                    {isOwnMessage && (
                      <button
                        onClick={() => handleReply(msg)}
                        aria-label="Répondre"
                        className="reply-btn opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full flex-shrink-0 active:opacity-100"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Time for own messages (last in group only) */}
                  {isOwnMessage && isLast && (
                    <span className="text-[10px] mt-0.5 mr-1" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(msg.createdAt)}
                    </span>
                  )}

                  {/* Réactions */}
                  <div className={isOwnMessage ? 'flex justify-end' : ''}>
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
