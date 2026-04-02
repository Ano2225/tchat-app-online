'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import type { EmojiClickData, Theme } from 'emoji-picker-react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import chatService from '@/services/chatServices';
import axiosInstance from '@/utils/axiosInstance';
import GenderAvatar from '@/components/ui/GenderAvatar';
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
  const [pickerPos, setPickerPos] = useState<{ bottom: number; right: number; width: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    <div className="fixed z-50 flex flex-col inset-x-2 top-[5rem] bottom-[4.5rem] md:inset-auto md:bottom-4 md:right-4 md:w-[340px]">

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
        className="flex flex-col rounded-2xl overflow-hidden animate-chat-in h-full md:h-[460px]"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 flex-shrink-0"
          style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="relative flex-shrink-0">
            <GenderAvatar
              username={recipient.username}
              avatarUrl={recipient.avatarUrl}
              sexe={recipient.sexe}
              size="sm"
              className="w-8 h-8 rounded-xl"
              clickable={false}
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{
                background: isRecipientOnline ? 'var(--online)' : 'var(--text-muted)',
                borderColor: 'var(--bg-elevated)',
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
              {recipient.username}
            </p>
            <p className="text-[11px] leading-tight" style={{ color: isRecipientOnline ? 'var(--online)' : 'var(--text-muted)' }}>
              {isRecipientOnline ? '● En ligne' : '○ Hors ligne'}
            </p>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
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
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
              {blockedByMe ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldBan className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
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
              <X className="w-3.5 h-3.5" />
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
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-0.5" style={{ background: 'var(--bg-base)' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: isBlocked ? 'rgba(248,113,113,0.1)' : 'var(--accent-dim)' }}
              >
                {isBlocked
                  ? <ShieldBan className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                  : <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                }
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isBlocked
                  ? (blockedByMe ? 'Débloquez pour reprendre la conversation.' : 'Impossible d\'envoyer des messages.')
                  : `Démarrez la conversation avec ${recipient.username}`}
              </p>
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

              return (
                <div
                  key={message._id}
                  className={`flex items-end gap-1.5 ${isOwn ? 'justify-end animate-msg-right' : 'justify-start animate-msg-left'}`}
                  style={{ marginBottom: isLastInGroup ? '6px' : '1px' }}
                >
                  {!isOwn && (
                    <div className="w-5 h-5 flex-shrink-0 self-end mb-0.5">
                      {showAvatar ? (
                        <GenderAvatar
                          username={message.sender.username}
                          avatarUrl={message.sender.avatarUrl}
                          size="sm"
                          className="w-5 h-5 rounded-md"
                          clickable={false}
                        />
                      ) : <div className="w-5 h-5" />}
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-2.5 py-1.5 text-sm leading-relaxed ${isOptimistic ? 'opacity-60' : ''}`}
                      style={
                        isOwn
                          ? { background: 'var(--accent)', color: '#fff', borderRadius: isLastInGroup ? '16px 16px 4px 16px' : '16px 16px 4px 16px' }
                          : { background: 'var(--msg-other-bg)', color: 'var(--msg-other-text)', border: '1px solid var(--msg-other-border)', borderRadius: isLastInGroup ? '16px 16px 16px 4px' : '4px 16px 16px 16px' }
                      }
                    >
                      {message.media_url && /^https?:\/\//.test(message.media_url) && (
                        <div className="mb-1.5 -mx-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.media_url}
                            alt="Image"
                            className="max-w-full h-auto rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => { if (/^https?:\/\//.test(message.media_url!)) window.open(message.media_url, '_blank', 'noopener,noreferrer'); }}
                          />
                        </div>
                      )}
                      {message.content && (
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {message.content}
                        </span>
                      )}
                    </div>

                    {isLastInGroup && (
                      <div
                        className={`flex items-center gap-1 px-1 text-[10px] ${isOwn ? 'flex-row-reverse' : ''}`}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>{formatTime(message.createdAt)}</span>
                        {isOwn && (
                          isOptimistic
                            ? <span>···</span>
                            : <span style={{ color: message.read ? 'var(--accent)' : 'var(--text-muted)' }}>{message.read ? '✓✓' : '✓'}</span>
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
          className={`flex-shrink-0 px-2.5 py-2 ${isBlocked ? 'opacity-40 pointer-events-none select-none' : ''}`}
          title={isBlocked && !blockedByMe ? `${recipient.username} vous a bloqué` : undefined}
          style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)' }}
        >
          {selectedFile && (
            <div
              className="mb-1.5 flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <Paperclip className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="flex-1 truncate">{selectedFile.name}</span>
              <button type="button" onClick={() => setSelectedFile(null)} style={{ color: 'var(--danger)' }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-1.5">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])} className="hidden" />

            {/* Pill input row */}
            <div
              className="flex-1 flex items-end rounded-2xl px-2 py-1 gap-1 transition-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg transition-all self-end mb-0.5"
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
                placeholder={`Message…`}
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
                  minHeight: '28px',
                  maxHeight: '100px',
                  paddingTop: '3px',
                  paddingBottom: '3px',
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
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg transition-all self-end mb-0.5"
                title="Emoji"
                aria-expanded={showEmojiPicker}
                style={{ color: showEmojiPicker ? 'var(--accent)' : 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                onMouseLeave={e => { if (!showEmojiPicker) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: 'var(--accent)' }}
              title="Envoyer"
            >
              {uploading
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-3.5 h-3.5 text-white" />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PrivateChatBox;
