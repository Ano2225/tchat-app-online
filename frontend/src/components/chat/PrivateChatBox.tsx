'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { EmojiStyle, type EmojiClickData, type Theme } from 'emoji-picker-react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import chatService from '@/services/chatServices';
import axiosInstance from '@/utils/axiosInstance';
import GenderAvatar from '@/components/ui/GenderAvatar';
import AdminBadge from '@/components/ui/AdminBadge';
import { reportService } from '@/services/reportService';
import toast from 'react-hot-toast';
import { ShieldBan, ShieldCheck, Smile, Paperclip, Send, X } from 'lucide-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="w-72 h-40 rounded-xl flex items-center justify-center text-sm"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
      Chargement…
    </div>
  ),
});

interface PrivateChatBoxProps {
  recipient: {
    _id: string;
    username: string;
    avatarUrl?: string;
    sexe?: string;
    role?: string;
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
    role?: string;
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
  const [pickerPos, setPickerPos] = useState<{ bottom: number; right: number; width: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPrefetched = useRef(false);
  const messageBlockedHandlerRef = useRef<((data: { optimisticId?: string; blockedByMe?: boolean; blockedByThem?: boolean }) => void) | null>(null);

  // Detect dark mode
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Prefetch emoji picker
  useEffect(() => {
    if (!emojiPrefetched.current) {
      emojiPrefetched.current = true;
      const idleCallback = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
      if (typeof idleCallback === 'function') {
        idleCallback(() => import('emoji-picker-react'));
      } else {
        setTimeout(() => import('emoji-picker-react'), 800);
      }
    }
  }, []);

  // Fetch history + join room
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id) return;
      try {
        const result = await chatService.getPrivateMessages(user.id, recipient._id);
        if ('blocked' in result && result.blocked) {
          setIsBlocked(true);
          setBlockedByMe(result.blockedByMe === true);
          setMessages([]);
        } else {
          const fetched = result as Message[];
          setMessages(fetched);
          scrollToBottom('auto');
          if (fetched.length > 0 && socket) {
            socket.emit('mark_messages_read', { recipientId: recipient._id });
          }
        }
      } catch (error: unknown) {
        console.error('Error fetching private messages:', error);
      }
    };

    fetchMessages();

    if (socket && user?.id) {
      socket.emit('join_private_room', { recipientId: recipient._id });
      socket.emit('check_user_online', recipient._id);
    }
  }, [user, recipient, socket]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (emojiPickerRef.current?.contains(target)) return;
      if (emojiButtonRef.current?.contains(target)) return;
      setShowEmojiPicker(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowEmojiPicker(false);
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

  // Socket event handlers
  useEffect(() => {
    if (!socket || !recipient?._id || !user?.id) return;

    const handleReceiveMessage = (message: Message) => {
      // Guard: sender may be null if server failed to populate (should not happen after fix)
      if (!message?.sender?._id) return;

      const involvedIds = [message.sender._id, message.recipient].filter(Boolean);
      const isThisConversation =
        involvedIds.includes(user.id) && involvedIds.includes(recipient._id);
      if (!isThisConversation) return;

      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => {
          if (!m._id.startsWith('optimistic_')) return true;
          return !(
            m.sender._id === message.sender._id &&
            m.content === message.content &&
            (m.media_url || null) === (message.media_url || null)
          );
        });
        if (withoutOptimistic.some(m => m._id === message._id)) return withoutOptimistic;
        return [...withoutOptimistic, message];
      });
      scrollToBottom();

      if (message.sender._id !== user.id) {
        socket.emit('mark_messages_read', { recipientId: message.sender._id });
      }
    };

    const handleMessagesRead = ({ readBy }: { readBy: string }) => {
      if (readBy === recipient._id) {
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

    // Bug fix: store handler ref to properly remove it on cleanup
    const messageBlockedHandler = ({ optimisticId, blockedByMe: bme, blockedByThem: bth }: { optimisticId?: string; blockedByMe?: boolean; blockedByThem?: boolean }) => {
      if (optimisticId) {
        setMessages(prev => prev.filter(m => m._id !== optimisticId));
      }
      setIsBlocked(true);
      if (bme) {
        setBlockedByMe(true);
        toast.error(`Vous avez bloqué ${recipient.username}. Débloquez-le pour envoyer des messages.`);
      } else if (bth) {
        setBlockedByMe(false);
        toast.error(`${recipient.username} vous a bloqué.`);
      } else {
        toast.error('Impossible d\'envoyer ce message.');
      }
    };
    messageBlockedHandlerRef.current = messageBlockedHandler;

    // Handle server-side send errors — remove the stuck optimistic message
    const handlePrivateMessageError = ({
      optimisticId,
      message: errMsg,
    }: { optimisticId?: string; message?: string }) => {
      if (optimisticId) {
        setMessages(prev => prev.filter(m => m._id !== optimisticId));
      }
      toast.error(errMsg || 'Erreur lors de l\'envoi du message.');
    };

    socket.on('receive_private_message', handleReceiveMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('message_blocked', messageBlockedHandler);
    socket.on('private_message_error', handlePrivateMessageError);

    return () => {
      socket.off('receive_private_message', handleReceiveMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      // Bug fix: pass the specific handler reference, not a bare off()
      if (messageBlockedHandlerRef.current) {
        socket.off('message_blocked', messageBlockedHandlerRef.current);
      }
      socket.off('private_message_error', handlePrivateMessageError);
    };
  }, [socket, recipient, user]);

  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [newMessage, autoResizeTextarea]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
  };

  const handleFileSelect = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user?.id || !socket) return;

    try {
      setUploading(true);
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('media', selectedFile);
        const uploadResponse = await axiosInstance.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        mediaUrl = uploadResponse.data.url;
        mediaType = uploadResponse.data.media_type;
      }

      const messageContent = newMessage.trim();
      if (!messageContent && !mediaUrl) return;

      // Optimistic update — shown immediately, removed if server returns an error
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

      // Include optimisticId so the server can echo it back on error
      socket.emit('send_private_message', {
        optimisticId,
        recipientId: recipient._id,
        content: messageContent,
        media_url: mediaUrl,
        media_type: mediaType,
      });

      setNewMessage('');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setShowEmojiPicker(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message.');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    // Mobile: full-screen between header and tab bar. Desktop: compact corner popup.
    <div
      className="fixed z-50 flex flex-col md:inset-auto md:bottom-4 md:right-4 md:w-[360px]"
      style={{
        insetInline: '0',
        top: 'var(--header-h)',
        bottom: 'max(4rem, calc(3.5rem + env(safe-area-inset-bottom)))',
      }}
    >

      {/* Emoji Picker portal */}
      {showEmojiPicker && pickerPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={emojiPickerRef}
          style={{
            position: 'fixed',
            bottom: pickerPos.bottom,
            right: pickerPos.right,
            zIndex: 99999,
            filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.4))',
            maxWidth: `${pickerPos.width}px`,
          }}
        >
          <EmojiPicker
            width={pickerPos.width}
            emojiStyle={EmojiStyle.NATIVE}
            onEmojiClick={(emojiObject: EmojiClickData) => {
              setNewMessage(prev => prev + emojiObject.emoji);
              setShowEmojiPicker(false);
            }}
            theme={(isDark ? 'dark' : 'light') as Theme}
          />
        </div>,
        document.body
      )}

      {/* Chat panel */}
      <div
        className="flex flex-col overflow-hidden animate-chat-in h-full md:h-[520px] md:rounded-2xl"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-3 py-3 flex-shrink-0"
          style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="relative flex-shrink-0">
            <GenderAvatar
              username={recipient.username}
              avatarUrl={recipient.avatarUrl}
              sexe={recipient.sexe}
              size="sm"
              className="w-10 h-10 rounded-xl"
              clickable={false}
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{
                background: isRecipientOnline ? 'var(--online)' : 'var(--text-muted)',
                borderColor: 'var(--bg-elevated)',
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
              <span className="inline-flex items-center gap-1.5 max-w-full">
                <span className="truncate">{recipient.username}</span>
                {recipient.role === 'admin' && <AdminBadge className="flex-shrink-0" />}
              </span>
            </p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: isRecipientOnline ? 'var(--online)' : 'var(--text-muted)' }}>
              {isRecipientOnline ? '● En ligne' : '○ Hors ligne'}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={async () => {
                setBlockLoading(true);
                try {
                  if (blockedByMe) {
                    await reportService.unblockUser(recipient._id);
                    setIsBlocked(false);
                    setBlockedByMe(false);
                    toast.success(`${recipient.username} débloqué`);
                    if (user?.id) {
                      const fetched = await chatService.getPrivateMessages(user.id, recipient._id);
                      if (!('blocked' in fetched && fetched.blocked)) {
                        setMessages(fetched as Message[]);
                        scrollToBottom('auto');
                      }
                    }
                  } else {
                    await reportService.blockUser(recipient._id);
                    setIsBlocked(true);
                    setBlockedByMe(true);
                    setMessages([]);
                    toast.success(`${recipient.username} bloqué`);
                  }
                } catch {
                  toast.error('Erreur lors de l\'opération');
                } finally {
                  setBlockLoading(false);
                }
              }}
              disabled={blockLoading || (isBlocked && !blockedByMe)}
              title={blockedByMe ? 'Débloquer' : isBlocked ? 'Bloqué par cet utilisateur' : 'Bloquer'}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                if (isBlocked && !blockedByMe) return;
                (e.currentTarget as HTMLElement).style.color = blockedByMe ? 'var(--online)' : 'var(--danger)';
                (e.currentTarget as HTMLElement).style.background = blockedByMe ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {blockedByMe ? <ShieldCheck className="w-4 h-4" /> : <ShieldBan className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blocked notice — compact single line */}
        {isBlocked && (
          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0 text-xs"
            style={{ background: 'rgba(248,113,113,0.07)', borderBottom: '1px solid rgba(248,113,113,0.15)', color: 'var(--danger)' }}
          >
            <ShieldBan className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {blockedByMe
                ? `Vous avez bloqué ${recipient.username} — cliquez sur l'icône pour débloquer`
                : `${recipient.username} vous a bloqué`}
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" style={{ background: 'var(--bg-base)' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: isBlocked ? 'rgba(248,113,113,0.1)' : 'var(--accent-dim)' }}
              >
                {isBlocked
                  ? <ShieldBan className="w-6 h-6" style={{ color: 'var(--danger)' }} />
                  : <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                }
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {isBlocked
                  ? (blockedByMe ? `Vous avez bloqué ${recipient.username}` : `${recipient.username} vous a bloqué`)
                  : `Dites bonjour à ${recipient.username} 👋`}
              </p>
              {!isBlocked && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vos messages sont privés</p>
              )}
            </div>
          ) : (
            messages.map((message, index) => {
              const senderIdStr = message.sender?._id ?? null;
              const isOwn = senderIdStr === user?.id;
              const isOptimistic = message._id.startsWith('optimistic_');
              const prevMsg = messages[index - 1];
              const showAvatar = !isOwn && (!prevMsg || prevMsg.sender?._id !== senderIdStr);
              const nextMsg = messages[index + 1];
              const isLastInGroup = !nextMsg || nextMsg.sender?._id !== senderIdStr;

              /* Image-only message: no padding wrapper */
              const isImageOnly = !!message.media_url && !message.content;

              return (
                <div
                  key={message._id}
                  className={`flex items-end gap-2 ${isOwn ? 'justify-end animate-msg-right' : 'justify-start animate-msg-left'}`}
                  style={{ marginBottom: isLastInGroup ? '8px' : '2px' }}
                >
                  {!isOwn && (
                    <div className="w-6 h-6 flex-shrink-0 self-end mb-0.5">
                      {showAvatar ? (
                        <GenderAvatar
                          username={message.sender.username}
                          avatarUrl={message.sender.avatarUrl}
                          size="sm"
                          className="w-6 h-6 rounded-lg"
                          clickable={false}
                        />
                      ) : <div className="w-6 h-6" />}
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Bubble */}
                    <div
                      className={`text-sm leading-relaxed ${isOptimistic ? 'opacity-60' : ''} ${isImageOnly ? '' : 'px-3 py-2'}`}
                      style={
                        isOwn
                          ? {
                              background: isImageOnly ? 'transparent' : 'var(--accent)',
                              color: '#fff',
                              borderRadius: isOwn
                                ? (isLastInGroup ? '18px 18px 4px 18px' : '18px 18px 4px 18px')
                                : (isLastInGroup ? '18px 18px 18px 4px' : '4px 18px 18px 18px'),
                            }
                          : {
                              background: isImageOnly ? 'transparent' : 'var(--msg-other-bg)',
                              color: 'var(--msg-other-text)',
                              border: isImageOnly ? 'none' : '1px solid var(--msg-other-border)',
                              borderRadius: isLastInGroup ? '18px 18px 18px 4px' : '4px 18px 18px 18px',
                            }
                      }
                    >
                      {/* Image */}
                      {message.media_url && /^https?:\/\//.test(message.media_url) && (
                        <div className={message.content ? 'mb-2' : ''}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.media_url}
                            alt="Image"
                            className="block rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                            style={{
                              maxWidth: '220px',
                              maxHeight: '200px',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'cover',
                            }}
                            onClick={() => {
                              if (/^https?:\/\//.test(message.media_url!))
                                window.open(message.media_url, '_blank', 'noopener,noreferrer');
                            }}
                          />
                        </div>
                      )}
                      {/* Text */}
                      {message.content && (
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {message.content}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    {isLastInGroup && (
                      <div
                        className={`flex items-center gap-1 px-0.5 text-[10px] ${isOwn ? 'flex-row-reverse' : ''}`}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>{formatTime(message.createdAt)}</span>
                        {isOwn && (
                          isOptimistic
                            ? <span style={{ color: 'var(--text-muted)' }}>···</span>
                            : <span style={{ color: message.read ? 'var(--accent)' : 'var(--text-muted)' }}>
                                {message.read ? '✓✓' : '✓'}
                              </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className={`flex-shrink-0 px-3 py-2 ${isBlocked ? 'opacity-40 pointer-events-none select-none' : ''}`}
          title={isBlocked && !blockedByMe ? `${recipient.username} vous a bloqué` : undefined}
          style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)' }}
        >
          {/* Image preview */}
          {selectedFile && previewUrl && (
            <div className="mb-2 relative inline-block animate-fade-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Aperçu"
                className="block rounded-xl"
                style={{ maxWidth: '120px', maxHeight: '100px', objectFit: 'cover', border: '2px solid var(--border-default)' }}
              />
              <button
                type="button"
                onClick={handleFileClear}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                style={{ background: 'var(--danger)', color: 'white' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />

            {/* Input pill */}
            <div
              className="flex-1 flex items-end gap-1 px-2 py-1.5 rounded-full transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full transition-colors self-end mb-0.5"
                title="Joindre une image"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => { if (e.target.value.length <= 500) setNewMessage(e.target.value); }}
                placeholder="Message…"
                rows={1}
                maxLength={500}
                className="flex-1 bg-transparent text-sm focus:outline-none resize-none"
                style={{
                  color: 'var(--text-primary)',
                  caretColor: 'var(--accent)',
                  lineHeight: '1.5',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  minHeight: '24px',
                  maxHeight: '80px',
                  paddingTop: '3px',
                  paddingBottom: '3px',
                  alignSelf: 'center',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e as unknown as React.FormEvent);
                  }
                }}
              />

              <button
                type="button"
                onClick={() => {
                  if (!showEmojiPicker && emojiButtonRef.current) {
                    const rect = emojiButtonRef.current.getBoundingClientRect();
                    const pickerWidth = Math.min(350, window.innerWidth - 16);
                    const rawRight = window.innerWidth - rect.right;
                    const clampedRight = Math.max(8, Math.min(rawRight, window.innerWidth - pickerWidth - 8));
                    setPickerPos({ bottom: window.innerHeight - rect.top + 8, right: clampedRight, width: pickerWidth });
                  }
                  setShowEmojiPicker(v => !v);
                }}
                ref={emojiButtonRef}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full transition-colors self-end mb-0.5"
                title="Emoji"
                aria-expanded={showEmojiPicker}
                style={{ color: showEmojiPicker ? 'var(--accent)' : 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                onMouseLeave={e => { if (!showEmojiPicker) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Send button — same height as pill, circular */}
            <button
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
              className="flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 self-end"
              style={{
                width: '36px',
                height: '36px',
                background: (newMessage.trim() || selectedFile) ? 'var(--accent)' : 'var(--bg-elevated)',
                boxShadow: (newMessage.trim() || selectedFile) ? '0 2px 8px var(--accent-glow)' : 'none',
              }}
              title="Envoyer"
            >
              {uploading
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-3.5 h-3.5" style={{ color: (newMessage.trim() || selectedFile) ? 'white' : 'var(--text-muted)' }} />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PrivateChatBox;
