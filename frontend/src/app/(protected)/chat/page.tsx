'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatChannel from '@/components/chat/ChatChannel';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/ChatInput';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import UsersOnline from '@/components/chat/UsersOnline';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import toast from 'react-hot-toast';
import MentionBanner from '@/components/chat/MentionBanner';
import GenderAvatar from '@/components/ui/GenderAvatar';
import AdminBadge from '@/components/ui/AdminBadge';
import axiosInstance from '@/utils/axiosInstance';

const PrivateChatBox = dynamic(() => import('@/components/chat/PrivateChatBox'), { ssr: false });
const OnboardingModal = dynamic(() => import('@/components/ui/OnboardingModal'), { ssr: false });

const GamePanel = dynamic(() => import('@/components/Game/GamePanel'), { ssr: false });
const MusicPlayer = dynamic(() => import('@/components/ui/MusicPlayer'), { ssr: false });

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  createdAt: string;
  room?: string;
  replyTo?: Message;
  reactions?: Array<{
    emoji: string;
    users: { id: string; username: string }[];
    count: number;
  }>;
}

const ChatPage = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [currentRoom, setCurrentRoom] = useState('General');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [registeredOnSocket, setRegisteredOnSocket] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, { count: number; sender: { _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string } }>>({});
  const [notifChatUser, setNotifChatUser] = useState<{ _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string } | null>(null);
  const openChatUserIdRef = React.useRef<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; username: string; avatarUrl?: string; sexe?: string }[]>([]);
  const [mentionNotif, setMentionNotif] = useState<{
    fromUsername: string; room: string; preview: string;
    senderAvatarUrl?: string | null; senderSexe?: string | null;
  } | null>(null);

  const previousRoomRef = useRef<string | null>(null);

  // ── Onboarding — 7 jours après la première visite ─────────────────────────
  const OB_KEY = 'babichat_ob';
  const OB_TTL = 7 * 24 * 60 * 60 * 1000;
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAvailable, setOnboardingAvailable] = useState(false);

  useEffect(() => {
    if (user?.isAnonymous) return; // pas d'onboarding pour les anonymes
    try {
      const raw = localStorage.getItem(OB_KEY);
      if (!raw) {
        // Première visite → démarrer le compteur et ouvrir la modal
        localStorage.setItem(OB_KEY, JSON.stringify({ startedAt: Date.now() }));
        setShowOnboarding(true);
        setOnboardingAvailable(true);
      } else {
        const { startedAt } = JSON.parse(raw) as { startedAt: number };
        if (Date.now() - startedAt < OB_TTL) {
          // Dans la fenêtre de 7 jours → bouton ? disponible mais pas d'ouverture auto
          setOnboardingAvailable(true);
        }
        // Au-delà de 7 jours → rien
      }
    } catch {
      // localStorage indisponible → silencieux
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load initial unread counts from DB on mount
  useEffect(() => {
    if (!user?.id) return;
    axiosInstance.get(`/messages/conversations/${user.id}`)
      .then(res => {
        const data: Array<{
          user: { _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string };
          unreadCount: number;
        }> = Array.isArray(res.data) ? res.data : [];
        const initial: typeof unreadMap = {};
        for (const conv of data) {
          if (conv.unreadCount > 0 && conv.user?._id) {
            initial[conv.user._id] = { count: conv.unreadCount, sender: conv.user };
          }
        }
        setUnreadMap(initial);
      })
      .catch(() => {});
  }, [user?.id]);

  useGame(currentRoom, socket);

  // Track online users for @mention feature
  useEffect(() => {
    if (!socket) return;
    type UserItem = string | { username: string; userId?: string; avatarUrl?: string; sexe?: string };
    type Payload = UserItem[] | { room: string; users: UserItem[] };
    const normalize = (list: UserItem[]) =>
      list.map((item, i) =>
        typeof item === 'string'
          ? { id: `u_${i}`, username: item }
          : { id: item.userId || item.username || `u_${i}`, username: item.username, avatarUrl: item.avatarUrl, sexe: item.sexe }
      );
    const onGlobal = (payload: Payload) => {
      const list = Array.isArray(payload) ? payload : (payload.users || []);
      setOnlineUsers(normalize(list));
    };
    const onRoom = (payload: Payload) => {
      const list = Array.isArray(payload) ? payload : (payload.users || []);
      setOnlineUsers(normalize(list));
    };
    socket.on('update_user_list', onGlobal);
    socket.on('update_room_user_list', onRoom);
    return () => {
      socket.off('update_user_list', onGlobal);
      socket.off('update_room_user_list', onRoom);
    };
  }, [socket]);

  useEffect(() => {
    // Do not connect until the auth token is available (prevents connecting with null token
    // during cookieHydrating, then reconnecting once the session is restored).
    if (!token) return;

    let newSocket: Socket;

    import('socket.io-client').then(({ io }) => {
      newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', {
        auth: { token },
        withCredentials: true,
      });
      setSocket(newSocket);

    const handleConnect = () => {
      // Send a user_connected event as soon as the socket connects.
      // Use the authenticated username when available, otherwise send an anon id.
      const idPart = newSocket.id ?? Math.random().toString(36).slice(2, 8);
      const usernameToSend = user?.username ?? `anon_${idPart}`;
      try {
        newSocket.emit('user_connected', usernameToSend);
      } catch (err) {
        console.error('Failed to emit user_connected on connect', err);
      }
      // mark locally that we've registered on the socket so joins can happen safely
      setRegisteredOnSocket(true);

      // Ensure we join the default/current room after being registered on socket
      if (currentRoom) {
        newSocket.emit('join_room', currentRoom);
        previousRoomRef.current = currentRoom;
      }
    };

      newSocket.on('connect', handleConnect);
    });

    return () => {
      if (newSocket) {
        newSocket.off('connect');
        newSocket.disconnect();
      }
      setSocket(null);
      setRegisteredOnSocket(false);
    };
  // token changes when session is restored from cookie or on logout — reconnect accordingly.
  // currentRoom and user are intentionally excluded to avoid recreating the socket on room/username changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // Only attempt to join/leave rooms after we've registered the user on the socket
    if (!socket || !currentRoom || !registeredOnSocket) return;

    if (previousRoomRef.current) {
      socket.emit('leave_room', previousRoomRef.current);
    }

    socket.emit('join_room', currentRoom);
    previousRoomRef.current = currentRoom;

    return () => {
      socket.emit('leave_room', currentRoom);
    };
  }, [currentRoom, socket, registeredOnSocket]);

  useEffect(() => {
    if (!socket) return;
    
    const handleSessionReplaced = (data: { message?: string }) => {
      toast.error(data.message || 'Votre session a été remplacée par une nouvelle connexion.', {
        duration: 5000,
        position: 'top-center',
      });
      // Disconnect the socket only — do NOT call logout() here.
      // logout() clears localStorage which triggers the cross-tab storage listener
      // and would log out ALL open tabs, including the new tab that just connected.
      socket?.disconnect();
    };
    
    const handleNewPrivateMessage = (data: { message: { _id: string; content?: string; sender: { _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string }; createdAt: string }; senderId: string }) => {
      const sender = data.message.sender;
      const senderId = sender._id;
      // If chatbox is open for this sender, let the chatbox handle it (via new_private_message fallback)
      if (openChatUserIdRef.current === senderId) return;
      // Update unread count
      setUnreadMap(prev => ({
        ...prev,
        [senderId]: {
          count: (prev[senderId]?.count || 0) + 1,
          sender,
        },
      }));
      // Show notification toast
      toast((t) => (
        <div className="flex items-center gap-3 min-w-0">
          <GenderAvatar
            username={sender.username}
            avatarUrl={sender.avatarUrl}
            sexe={sender.sexe}
            size="sm"
            className="w-9 h-9 flex-shrink-0"
            clickable={false}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-flex items-center gap-1.5 max-w-full">
                <span className="truncate">{sender.username}</span>
                {sender.role === 'admin' && <AdminBadge className="flex-shrink-0" />}
              </span>
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{data.message.content || '📎 Image'}</p>
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              openChatUserIdRef.current = senderId;
              setNotifChatUser(sender);
              setUnreadMap(prev => { const m = { ...prev }; delete m[senderId]; return m; });
            }}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            Répondre
          </button>
        </div>
      ), { duration: 6000, position: 'bottom-right' });
    };

    const handleMentionNotification = (data: {
      fromUsername: string;
      room: string;
      preview: string;
      senderAvatarUrl?: string | null;
      senderSexe?: string | null;
    }) => {
      setMentionNotif(data);
    };

    const handleStatutNotification = (data: {
      username: string;
      statut: string;
      avatarUrl?: string | null;
      sexe?: string | null;
    }) => {
      toast(() => (
        <div className="flex items-center gap-3 min-w-0">
          <GenderAvatar
            username={data.username}
            avatarUrl={data.avatarUrl || undefined}
            sexe={data.sexe || undefined}
            size="sm"
            className="w-9 h-9 flex-shrink-0"
            clickable={false}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {data.username}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              est maintenant : <span style={{ color: 'var(--text-primary)' }}>{data.statut}</span>
            </p>
          </div>
        </div>
      ), { duration: 4000, position: 'bottom-left' });
    };

    socket.on('session_replaced', handleSessionReplaced);
    socket.on('new_private_message', handleNewPrivateMessage);
    socket.on('mention_notification', handleMentionNotification);
    socket.on('statut_notification', handleStatutNotification);

    return () => {
      socket.off('session_replaced', handleSessionReplaced);
      socket.off('new_private_message', handleNewPrivateMessage);
      socket.off('mention_notification', handleMentionNotification);
      socket.off('statut_notification', handleStatutNotification);
    };
  }, [socket, currentRoom]);
  // Note: we emit `user_connected` on socket 'connect' and gate joins until registration.
  // If the user's username changes after initial connect (e.g., logs in), inform the server
  // so it can update mapping without reconnecting.
  useEffect(() => {
    if (!socket || !registeredOnSocket) return;
    if (user?.username) {
      try {
        socket.emit('update_username', user.username);
      } catch (err) {
        console.error('Failed to emit update_username', err);
      }
    }
  }, [socket, registeredOnSocket, user?.username]);
  // Messages are handled within ChatMessage.

  const handleJoinRoom = (roomName: string) => {
    setCurrentRoom(roomName);
    setReplyTo(null); // Clear reply when changing rooms
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleOpenChatFromSidebar = (user: { _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string }) => {
    openChatUserIdRef.current = user._id;
    setNotifChatUser(user);
    setUnreadMap(prev => { const m = { ...prev }; delete m[user._id]; return m; });
  };

  const [showChannels, setShowChannels] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showDesktopMusicPlayer, setShowDesktopMusicPlayer] = useState(false);
  const isGameRoom = currentRoom === 'Game';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const syncDesktopState = (event?: MediaQueryListEvent) => {
      setShowDesktopMusicPlayer(event ? event.matches : mediaQuery.matches);
    };

    syncDesktopState();
    mediaQuery.addEventListener('change', syncDesktopState);

    return () => {
      mediaQuery.removeEventListener('change', syncDesktopState);
    };
  }, []);

  // Auto-scroll game panel to top on each new question
  const gamePanelRef = useRef<HTMLDivElement>(null);
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  useEffect(() => {
    if (gamePanelRef.current) {
      gamePanelRef.current.scrollTop = 0;
    }
  }, [currentQuestion?.question]);

  return (
    <main className="h-screen-dynamic flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <ChatHeader
        users={user || undefined}
        socket={socket}
        totalUnread={Object.values(unreadMap).reduce((s, e) => s + e.count, 0)}
        onOpenChat={handleOpenChatFromSidebar}
        onShowOnboarding={onboardingAvailable ? () => setShowOnboarding(true) : undefined}
      />

      <MentionBanner
        notif={mentionNotif}
        onDismiss={() => setMentionNotif(null)}
        onNavigate={handleJoinRoom}
      />

      {/* Mobile: Bottom action bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-4 pt-2 safe-bottom"
        style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border-default)', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => { setShowChannels(v => !v); setShowUsers(false); }}
          data-tour="mobile-channels"
          className="flex flex-col items-center gap-0.5 min-w-[4rem] py-2 rounded-xl transition-all active:scale-95"
          style={{ color: showChannels ? 'var(--accent)' : 'var(--text-muted)', background: showChannels ? 'var(--accent-dim)' : 'transparent' }}
          aria-label="Salons"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs font-medium">Salons</span>
        </button>
        <button
          onClick={() => { setShowUsers(v => !v); setShowChannels(false); }}
          data-tour="mobile-users"
          className="flex flex-col items-center gap-0.5 min-w-[4rem] py-2 rounded-xl transition-all active:scale-95"
          style={{ color: showUsers ? 'var(--accent)' : 'var(--text-muted)', background: showUsers ? 'var(--accent-dim)' : 'transparent' }}
          aria-label="Utilisateurs"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-xs font-medium">En ligne</span>
        </button>
        {isGameRoom && (
          <button
            onClick={() => setShowGame(!showGame)}
            className="flex flex-col items-center gap-0.5 min-w-[4rem] py-2 rounded-xl transition-all active:scale-95"
            style={{ color: showGame ? 'var(--accent)' : 'var(--text-muted)', background: showGame ? 'var(--accent-dim)' : 'transparent' }}
            aria-label="Quiz"
          >
            <span className="text-xl leading-none">🧠</span>
            <span className="text-xs font-medium">Quiz</span>
          </button>
        )}
      </div>

      {/* Mobile Game Panel overlay */}
      {isGameRoom && showGame && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGame(false)} />
          <div className="relative w-full max-h-[80vh] rounded-t-2xl overflow-y-auto p-4 space-y-3" style={{ background: 'var(--bg-panel)' }}>
            <button
              onClick={() => setShowGame(false)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl"
              aria-label="Fermer le quiz"
            >
              ×
            </button>
            <GamePanel channel={currentRoom} socket={socket ?? undefined} />
          </div>
        </div>
      )}

      <div className="chat-body relative flex flex-1 min-h-0 gap-2 overflow-hidden p-2">
        {/* Channel Sidebar - Desktop always visible, Mobile overlay */}
        <div
          className={`lg:flex lg:min-h-0 lg:flex-shrink-0 lg:relative lg:translate-x-0 fixed bottom-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${showChannels ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          style={{ top: 'var(--header-h)' }}
        >
          <div className="h-full lg:min-h-0">
            <ChatChannel
              onJoinRoom={handleJoinRoom}
              currentRoom={currentRoom}
              socket={socket}
              onClose={() => setShowChannels(false)}
            />
          </div>
        </div>

        {/* Overlay for mobile */}
        {(showChannels || showUsers) && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
            onClick={() => {
              setShowChannels(false);
              setShowUsers(false);
            }}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden">
          {/* Chat principal */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>
            <ErrorBoundary>
              <ChatMessage currentRoom={currentRoom} socket={socket} onReply={handleReply} />
            </ErrorBoundary>
            <ErrorBoundary>
              <ChatInput
                currentRoom={currentRoom}
                socket={socket}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
                mentionUsers={onlineUsers}
              />
            </ErrorBoundary>
          </div>
          
          {currentRoom === 'Game' && (
            <div ref={gamePanelRef} className="hidden lg:flex w-80 min-h-0 flex-col gap-3 overflow-y-auto rounded-xl p-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>
              <GamePanel channel={currentRoom} socket={socket ?? undefined} />
            </div>
          )}
        </div>

        {/* Users Sidebar - Desktop always visible, Mobile overlay */}
        <div
          className={`lg:flex lg:min-h-0 lg:flex-shrink-0 lg:relative lg:translate-x-0 fixed bottom-0 right-0 w-full sm:w-72 lg:w-auto z-40 transform transition-transform duration-300 ease-in-out ${showUsers ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
          style={{ top: 'var(--header-h)' }}
        >
          <div className="h-full lg:min-h-0">
            <ErrorBoundary>
              <UsersOnline
                socket={socket}
                currentRoom={currentRoom}
                unreadMap={unreadMap}
                onOpenChat={handleOpenChatFromSidebar}
                onClose={() => setShowUsers(false)}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>
      {/* Private chat opened via notification or sidebar click */}
      {notifChatUser && socket && (
        <PrivateChatBox
          recipient={notifChatUser}
          socket={socket}
          onClose={() => {
            openChatUserIdRef.current = null;
            setNotifChatUser(null);
            // Refresh unread map from DB so header badge reflects read state
            if (user?.id) {
              axiosInstance.get(`/messages/conversations/${user.id}`)
                .then(res => {
                  const data: Array<{
                    user: { _id: string; username: string; avatarUrl?: string; sexe?: string; role?: string };
                    unreadCount: number;
                  }> = Array.isArray(res.data) ? res.data : [];
                  setUnreadMap(prev => {
                    const next = { ...prev };
                    // Update counts from DB; remove entries that are now read
                    for (const conv of data) {
                      if (!conv.user?._id) continue;
                      if (conv.unreadCount > 0) {
                        next[conv.user._id] = { count: conv.unreadCount, sender: conv.user };
                      } else {
                        delete next[conv.user._id];
                      }
                    }
                    return next;
                  });
                })
                .catch(() => {});
            }
          }}
        />
      )}
      {showDesktopMusicPlayer ? <MusicPlayer /> : null}

      {/* Onboarding — affiché auto à la première visite, accessible 7 jours via bouton ? */}
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </main>
  );
};

export default ChatPage;
