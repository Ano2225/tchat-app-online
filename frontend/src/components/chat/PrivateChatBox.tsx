'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';
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
  const [pickerPos, setPickerPos] = useState<{ bottom: number; right: number } | null>(null);
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
    // Outer fixed container
    <div className="fixed bottom-4 right-4 z-50 flex flex-col" style={{ width: '400px', maxWidth: 'calc(100vw - 2rem)' }}>

      {/* Emoji Picker — rendered in a portal at body level to avoid z-index/overflow clipping */}
      {showEmojiPicker && pickerPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={emojiPickerRef}
          style={{
            position: 'fixed',
            bottom: pickerPos.bottom,
            right: pickerPos.right,
            zIndex: 99999,
            filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.45))',
          }}
        >
          <EmojiPicker
            onEmojiClick={(emojiObject: EmojiClickData) => {
              setNewMessage(prev => prev + emojiObject.emoji);
              setShowEmojiPicker(false);
            }}
            theme={isDark ? ('dark' as Parameters<typeof EmojiPicker>[0] extends { theme?: infer T } ? T : never) : ('light' as Parameters<typeof EmojiPicker>[0] extends { theme?: infer T } ? T : never)}
          />
        </div>,
        document.body
      )}

      {/* Chat panel */}
      <div
        className="flex flex-col rounded-2xl overflow-hidden animate-chat-in"
        style={{
          height: '520px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}
        >
          <div className="relative flex-shrink-0">
            <GenderAvatar
              username={recipient.username}
              avatarUrl={recipient.avatarUrl}
              sexe={recipient.sexe}
              size="sm"
              className="w-9 h-9 rounded-xl"
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
            <p
              className="text-sm font-semibold truncate"
              style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
            >
              {recipient.username}
            </p>
            <p
              className="text-xs"
              style={{
                fontFamily: 'var(--font-ui)',
                color: isRecipientOnline ? 'var(--online)' : 'var(--text-muted)',
              }}
            >
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
                      setMessages(fetched);
                      scrollToBottom('auto');
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
              {blockedByMe
                ? <ShieldCheck className="w-4 h-4" />
                : <ShieldBan className="w-4 h-4" />
              }
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
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

        {/* Blocked banner */}
        {isBlocked && (
          <div
            className="flex flex-col gap-0.5 px-4 py-2.5 flex-shrink-0"
            style={{
              background: 'rgba(248,113,113,0.08)',
              borderBottom: '1px solid rgba(248,113,113,0.2)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--danger)' }}>
              <ShieldBan className="w-3.5 h-3.5 flex-shrink-0" />
              {blockedByMe ? `Vous avez bloqué ${recipient.username}` : `${recipient.username} vous a bloqué`}
            </div>
            <p className="text-xs pl-5" style={{ color: 'var(--text-muted)' }}>
              {blockedByMe
                ? <>Cliquez sur <ShieldCheck className="inline w-3 h-3 mx-0.5" /> pour débloquer et reprendre la conversation.</>
                : 'Vous ne pouvez pas envoyer de messages à cet utilisateur.'
              }
            </p>
          </div>
        )}

        {/* ── Messages ── */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-1"
          style={{ background: 'var(--bg-base)' }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: isBlocked ? 'rgba(248,113,113,0.1)' : 'var(--accent-dim)' }}
              >
                {isBlocked ? (
                  <ShieldBan className="w-7 h-7" style={{ color: 'var(--danger)' }} />
                ) : (
                  <svg className="w-7 h-7" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-ui)', color: isBlocked ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {isBlocked
                    ? (blockedByMe ? `Vous avez bloqué ${recipient.username}` : `${recipient.username} vous a bloqué`)
                    : 'Démarrez la conversation'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {isBlocked
                    ? (blockedByMe
                        ? 'Débloquez cet utilisateur pour reprendre la conversation.'
                        : 'Vous ne pouvez pas envoyer de messages à cet utilisateur.')
                    : `Envoyez votre premier message à ${recipient.username}`}
                </p>
              </div>
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
                  className={`flex items-end gap-2 ${isOwn ? 'justify-end animate-msg-right' : 'justify-start animate-msg-left'}`}
                  style={{ marginBottom: isLastInGroup ? '8px' : '2px' }}
                >
                  {/* Avatar (other user only) */}
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
                      ) : (
                        <div className="w-6 h-6" />
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Bubble */}
                    <div
                      className={`px-3 py-2 text-sm leading-relaxed ${isOptimistic ? 'opacity-60' : ''}`}
                      style={
                        isOwn
                          ? {
                            background: 'var(--accent)',
                            color: '#FFFFFF',
                            borderRadius: isLastInGroup ? '18px 18px 4px 18px' : '18px 18px 4px 18px',
                          }
                          : {
                            background: 'var(--msg-other-bg)',
                            color: 'var(--msg-other-text)',
                            border: '1px solid var(--msg-other-border)',
                            borderRadius: isLastInGroup ? '18px 18px 18px 4px' : '4px 18px 18px 18px',
                          }
                      }
                    >
                      {message.media_url && /^https?:\/\//.test(message.media_url) && (
                        <div className="mb-2 -mx-1">
                          <img
                            src={message.media_url}
                            alt="Image"
                            className="max-w-full h-auto rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              if (/^https?:\/\//.test(message.media_url!)) {
                                window.open(message.media_url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          />
                        </div>
                      )}
                      {message.content && (
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {message.content}
                        </span>
                      )}
                    </div>

                    {/* Timestamp + read receipt */}
                    {isLastInGroup && (
                      <div
                        className={`flex items-center gap-1 px-1 text-[10px] ${isOwn ? 'flex-row-reverse' : ''}`}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>{formatTime(message.createdAt)}</span>
                        {isOwn && (
                          isOptimistic ? (
                            <span>···</span>
                          ) : (
                            <span style={{ color: message.read ? 'var(--accent)' : 'var(--text-muted)' }}>
                              {message.read ? '✓✓' : '✓'}
                            </span>
                          )
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

        {/* ── Input ── */}
        <div
          className={`flex-shrink-0 px-3 py-3 ${isBlocked ? 'opacity-40 pointer-events-none select-none' : ''}`}
          title={isBlocked && !blockedByMe ? `${recipient.username} vous a bloqué` : undefined}
          style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border-default)' }}
        >
          {selectedFile && (
            <div
              className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <Paperclip className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="flex-1 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                style={{ color: 'var(--danger)' }}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all"
              title="Joindre une image"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!showEmojiPicker && emojiButtonRef.current) {
                  const rect = emojiButtonRef.current.getBoundingClientRect();
                  setPickerPos({
                    bottom: window.innerHeight - rect.top + 8,
                    right: window.innerWidth - rect.right,
                  });
                }
                setShowEmojiPicker(v => !v);
              }}
              ref={emojiButtonRef}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all"
              title="Emoji"
              aria-expanded={showEmojiPicker}
              style={{ color: showEmojiPicker ? 'var(--accent)' : 'var(--text-muted)', background: showEmojiPicker ? 'var(--accent-dim)' : 'transparent' }}
              onMouseEnter={e => {
                if (!showEmojiPicker) {
                  (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)';
                }
              }}
              onMouseLeave={e => {
                if (!showEmojiPicker) {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <Smile className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setNewMessage(e.target.value);
                }
              }}
              placeholder={`Message à ${recipient.username}…`}
              rows={1}
              maxLength={500}
              className="flex-1 rounded-xl px-3 py-2 text-sm transition-all focus:outline-none resize-none"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                caretColor: 'var(--accent)',
                lineHeight: '1.5',
                overflowY: 'auto',
                overflowX: 'hidden',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                minHeight: '36px',
                maxHeight: '120px',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-dim)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as unknown as React.FormEvent);
                }
              }}
            />

            <button
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: 'var(--accent)' }}
              title="Envoyer"
            >
              {uploading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PrivateChatBox;
