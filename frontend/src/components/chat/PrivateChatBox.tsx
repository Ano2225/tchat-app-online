import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import chatService from '@/services/chatServices';
import axiosInstance from '@/utils/axiosInstance';
import GenderAvatar from '@/components/ui/GenderAvatar';
import { reportService } from '@/services/reportService';
import toast from 'react-hot-toast';
import { ShieldBan, ShieldCheck } from 'lucide-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="w-72 h-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-sm text-gray-500">
      Chargement des emojis...
    </div>
  )
});

interface PrivateChatBoxProps {
  recipient: {
    _id: string;
    username: string;
    avatarUrl?: string;
    sexe?: string;
  };
  socket: Socket | null;
  onClose: () => void;
}

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  recipient?: string;
  media_url?: string;
  media_type?: string;
  createdAt: string;
  read: boolean;
}

const PrivateChatBox: React.FC<PrivateChatBoxProps> = ({ recipient, socket, onClose }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecipientOnline, setIsRecipientOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPrefetched = useRef(false);

  useEffect(() => {
    if (!emojiPrefetched.current) {
      emojiPrefetched.current = true;
      const idleCallback = (window as any).requestIdleCallback;
      if (typeof idleCallback === 'function') {
        idleCallback(() => import('emoji-picker-react'));
      } else {
        setTimeout(() => import('emoji-picker-react'), 800);
      }
    }

    const fetchMessages = async () => {
      if (!user?.id) return;

      try {
        const fetchedMessages = await chatService.getPrivateMessages(user.id, recipient._id);
        setMessages(fetchedMessages);
        scrollToBottom();

        if (fetchedMessages.length > 0) {
          await chatService.markConversationAsRead(user.id, recipient._id);
        }
      } catch (error: unknown) {
        const status = (error as { response?: { data?: { isBlocked?: boolean } } })?.response?.data?.isBlocked;
        if (status) setIsBlocked(true);
        else console.error('Error fetching private messages:', error);
      }
    };

    fetchMessages();

    if (socket && user?.id) {
      socket.emit('join_private_room', {
        recipientId: recipient._id
      });
      socket.emit('check_user_online', recipient._id);
    }
  }, [user, recipient, socket]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (emojiPickerRef.current?.contains(target)) return;
      if (emojiButtonRef.current?.contains(target)) return;
      setShowEmojiPicker(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!socket || !recipient?._id || !user?.id) return;

    const handleReceiveMessage = (message: Message) => {
      // Only handle messages that belong to this conversation
      const involvedIds = [message.sender._id, message.recipient].filter(Boolean);
      const isThisConversation =
        involvedIds.includes(user.id) &&
        involvedIds.includes(recipient._id);
      if (!isThisConversation) return;

      setMessages(prev => {
        // Remove matching optimistic message (same sender + content + media_url)
        const withoutOptimistic = prev.filter(m => {
          if (!m._id.startsWith('optimistic_')) return true;
          return !(
            m.sender._id === message.sender._id &&
            m.content === message.content &&
            m.media_url === message.media_url
          );
        });
        // Avoid duplicate real messages
        if (withoutOptimistic.some(m => m._id === message._id)) return withoutOptimistic;
        return [...withoutOptimistic, message];
      });
      scrollToBottom();

      // Auto-mark as read when chatbox is open
      if (socket && user?.id && message.sender._id !== user.id) {
        socket.emit('mark_messages_read', {
          recipientId: message.sender._id
        });
      }
    };

    const handleMessagesRead = ({ readBy }: { readBy: string }) => {
      if (readBy === recipient._id) {
        // Mettre à jour les messages envoyés par l'utilisateur actuel comme lus
        setMessages(prev => prev.map(msg => 
          msg.sender._id === user?.id ? { ...msg, read: true } : msg
        ));
      }
    };

    const handleUserOnline = (userId: string) => {
      if (userId === recipient._id) setIsRecipientOnline(true);
    };

    const handleUserOffline = (userId: string) => {
      if (userId === recipient._id) setIsRecipientOnline(false);
    };

    // Fallback: also handle new_private_message via personal room
    // This ensures the recipient sees the message even if the private room join failed
    const handleNewPrivateMessageFallback = (data: { message: Message; senderId: string }) => {
      if (data.senderId !== recipient._id) return;
      handleReceiveMessage(data.message);
    };

    socket.on('receive_private_message', handleReceiveMessage);
    socket.on('new_private_message', handleNewPrivateMessageFallback);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('message_blocked', () => {
      toast.error('Impossible d\'envoyer ce message — utilisateur bloqué.');
      setIsBlocked(true);
    });

    return () => {
      socket.off('receive_private_message', handleReceiveMessage);
      socket.off('new_private_message', handleNewPrivateMessageFallback);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('message_blocked');
    };
  }, [socket, recipient, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user?.id || !socket) return;

    try {
      setUploading(true);
      let mediaUrl = undefined;
      let mediaType = undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('media', selectedFile);

        const uploadResponse = await axiosInstance.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        mediaUrl = uploadResponse.data.url;
        mediaType = uploadResponse.data.media_type;
      }

      const messageContent = newMessage.trim();
      if (!messageContent && !mediaUrl) {
        throw new Error('Message must contain text or media');
      }

      // Optimistic display: add message immediately so sender sees it right away
      const optimisticId = `optimistic_${Date.now()}`;
      const optimisticMsg: Message = {
        _id: optimisticId,
        content: messageContent,
        sender: { _id: user.id, username: user.username },
        media_url: mediaUrl,
        media_type: mediaType,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setMessages(prev => [...prev, optimisticMsg]);
      scrollToBottom();

      // Envoyer via socket
      socket.emit('send_private_message', {
        senderId: user.id,
        recipientId: recipient._id,
        content: messageContent,
        media_url: mediaUrl,
        media_type: mediaType,
      });

      setNewMessage('');
      setSelectedFile(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="fixed bottom-20 right-6 z-[9999] transition-all duration-150 ease-out"
        >
          <EmojiPicker onEmojiClick={(emojiObject: EmojiClickData) => {
            setNewMessage(prev => prev + emojiObject.emoji);
            setShowEmojiPicker(false);
          }} />
        </div>
      )}
      
      <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 shadow-2xl z-50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GenderAvatar
              username={recipient.username}
              avatarUrl={recipient.avatarUrl}
              sexe={recipient.sexe}
              size="sm"
              className="w-8 h-8 border border-white/30"
              clickable={false}
            />
            <div>
              <div className="font-medium text-sm">{recipient.username}</div>
              <div className="flex items-center space-x-1 text-xs opacity-90">
                <div className={`w-2 h-2 rounded-full ${isRecipientOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span>{isRecipientOnline ? 'En ligne' : 'Hors ligne'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setBlockLoading(true);
                try {
                  if (isBlocked) {
                    await reportService.unblockUser(recipient._id);
                    setIsBlocked(false);
                    toast.success(`${recipient.username} débloqué`);
                  } else {
                    await reportService.blockUser(recipient._id);
                    setIsBlocked(true);
                    toast.success(`${recipient.username} bloqué`);
                  }
                } catch {
                  toast.error('Erreur lors de l\'opération');
                } finally {
                  setBlockLoading(false);
                }
              }}
              disabled={blockLoading}
              title={isBlocked ? 'Débloquer' : 'Bloquer'}
              className="text-white/70 hover:text-white transition-colors disabled:opacity-50"
            >
              {isBlocked
                ? <ShieldCheck className="w-4 h-4" />
                : <ShieldBan className="w-4 h-4" />
              }
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white text-lg">×</button>
          </div>
        </div>

        {/* Blocked banner */}
        {isBlocked && (
          <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-4 py-2 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <ShieldBan className="w-3 h-3 flex-shrink-0" />
            Vous ne pouvez pas échanger de messages avec cet utilisateur.
          </div>
        )}

        {/* Messages */}
        <div className="h-80 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Aucun message
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => {
                const isOwn = message.sender._id === user?.id;
                return (
                  <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm break-words ${
                      isOwn 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md' 
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md shadow-sm'
                    }`}>
                      {message.media_url && /^https?:\/\//.test(message.media_url) && (
                        <div className="mb-2">
                          <img
                            src={message.media_url}
                            alt="Image"
                            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              if (/^https?:\/\//.test(message.media_url!)) {
                                window.open(message.media_url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          />
                        </div>
                      )}
                      {message.content && <div>{message.content}</div>}
                      <div className={`text-xs mt-2 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        {isOwn && <span className="ml-1">{message.read ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className={`border-t border-gray-200/50 dark:border-gray-600/50 p-4 bg-white/50 dark:bg-gray-800/50 ${isBlocked ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {selectedFile && (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center justify-between">
              <span>Image: {selectedFile.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Joindre une image"
            >
              📎
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              ref={emojiButtonRef}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Ajouter un emoji"
              aria-expanded={showEmojiPicker}
            >
              😊
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Envoyer le message"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateChatBox;
