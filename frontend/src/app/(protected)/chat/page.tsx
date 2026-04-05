'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatChannel from '@/components/chat/ChatChannel';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/ChatInput';
import GamePanel from '@/components/Game/GamePanel';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import UsersOnline from '@/components/chat/UsersOnline';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import toast from 'react-hot-toast';
import PrivateChatBox from '@/components/chat/PrivateChatBox';
import GenderAvatar from '@/components/ui/GenderAvatar';
import axiosInstance from '@/utils/axiosInstance';
import MusicPlayer from '@/components/ui/MusicPlayer';

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
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [currentRoom, setCurrentRoom] = useState('General');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [registeredOnSocket, setRegisteredOnSocket] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, { count: number; sender: { _id: string; username: string; avatarUrl?: string; sexe?: string } }>>({});
  const [notifChatUser, setNotifChatUser] = useState<{ _id: string; username: string; avatarUrl?: string; sexe?: string } | null>(null);
  const openChatUserIdRef = React.useRef<string | null>(null);

  const previousRoomRef = useRef<string | null>(null);

  // Load initial unread counts from DB on mount
  useEffect(() => {
    if (!user?.id) return;
    axiosInstance.get(`/messages/conversations/${user.id}`)
      .then(res => {
        const data: Array<{
          user: { _id: string; username: string; avatarUrl?: string; sexe?: string };
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

  useEffect(() => {
    const currentToken = useAuthStore.getState().token;
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', {
      auth: { token: currentToken },
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

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.disconnect();
    };
  // We intentionally do not include `currentRoom` here to avoid recreating the socket when the room changes.
  // `user` is used only to pick the username to send on first connect; updates to username are handled elsewhere.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    
    const handleUsernameTaken = (data: { message?: string }) => {
      toast.error(data.message || 'Ce nom d\'utilisateur est déjà utilisé.', {
        duration: 6000,
        position: 'top-center',
      });
      setTimeout(() => {
        logout();
        router.push('/anonymous');
      }, 2000);
    };
    
    const handleUsernameReserved = (data: { message?: string }) => {
      toast.error(data.message || 'Ce nom d\'utilisateur appartient à un compte enregistré.', {
        duration: 6000,
        position: 'top-center',
      });
      setTimeout(() => {
        logout();
        router.push('/login');
      }, 2000);
    };
    
    const handleSessionReplaced = (data: { message?: string }) => {
      toast.error(data.message || 'Votre session a été remplacée par une nouvelle connexion.', {
        duration: 5000,
        position: 'top-center',
      });
      setTimeout(() => {
        logout();
        window.location.reload();
      }, 3000);
    };
    
    const handleNewPrivateMessage = (data: { message: { _id: string; content?: string; sender: { _id: string; username: string; avatarUrl?: string; sexe?: string }; createdAt: string }; senderId: string }) => {
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
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{sender.username}</p>
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

    socket.on('username_taken', handleUsernameTaken);
    socket.on('username_reserved', handleUsernameReserved);
    socket.on('session_replaced', handleSessionReplaced);
    socket.on('new_private_message', handleNewPrivateMessage);

    return () => {
      socket.off('username_taken', handleUsernameTaken);
      socket.off('username_reserved', handleUsernameReserved);
      socket.off('session_replaced', handleSessionReplaced);
      socket.off('new_private_message', handleNewPrivateMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleOpenChatFromSidebar = (user: { _id: string; username: string; avatarUrl?: string; sexe?: string }) => {
    openChatUserIdRef.current = user._id;
    setNotifChatUser(user);
    setUnreadMap(prev => { const m = { ...prev }; delete m[user._id]; return m; });
  };

  const [showChannels, setShowChannels] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const isGameRoom = currentRoom === 'Game';

  // Auto-scroll game panel to top on each new question
  const gamePanelRef = useRef<HTMLDivElement>(null);
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  useEffect(() => {
    if (gamePanelRef.current) {
      gamePanelRef.current.scrollTop = 0;
    }
  }, [currentQuestion?.question]);

  return (
    <div className="h-screen" style={{ background: 'var(--bg-base)' }}>
      <ChatHeader
        users={user || undefined}
        socket={socket}
        totalUnread={Object.values(unreadMap).reduce((s, e) => s + e.count, 0)}
        onOpenChat={handleOpenChatFromSidebar}
      />
      
      {/* Mobile: Bottom action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-4 py-2 safe-area-pb"
        style={{ background: 'var(--bg-panel)', borderTop: '1px solid var(--border-default)' }}>
        <button
          onClick={() => { setShowChannels(v => !v); setShowUsers(false); }}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all"
          style={{ color: showChannels ? 'var(--accent)' : 'var(--text-muted)', background: showChannels ? 'var(--accent-dim)' : 'transparent' }}
          aria-label="Salons"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-medium">Salons</span>
        </button>
        <button
          onClick={() => { setShowUsers(v => !v); setShowChannels(false); }}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all"
          style={{ color: showUsers ? 'var(--accent)' : 'var(--text-muted)', background: showUsers ? 'var(--accent-dim)' : 'transparent' }}
          aria-label="Utilisateurs"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-medium">En ligne</span>
        </button>
        {isGameRoom && (
          <button
            onClick={() => setShowGame(!showGame)}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all"
            style={{ color: showGame ? 'var(--accent)' : 'var(--text-muted)', background: showGame ? 'var(--accent-dim)' : 'transparent' }}
            aria-label="Quiz"
          >
            <span className="text-xl leading-none">🧠</span>
            <span className="text-[10px] font-medium">Quiz</span>
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

      <div className="flex h-[calc(100vh-80px)] gap-2 p-2 pb-16 lg:pb-2 relative">
        {/* Channel Sidebar - Desktop always visible, Mobile overlay */}
        <div className={`
          md:flex-shrink-0 md:relative md:translate-x-0
          fixed top-20 bottom-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
          ${showChannels ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="h-full md:h-auto">
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
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
            onClick={() => {
              setShowChannels(false);
              setShowUsers(false);
            }}
          />
        )}

        <div className="flex flex-1 gap-2 min-w-0">
          {/* Chat principal */}
          <div className="flex flex-col flex-1 rounded-xl overflow-hidden min-w-0" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>
            <ErrorBoundary>
              <ChatMessage currentRoom={currentRoom} socket={socket} onReply={handleReply} />
            </ErrorBoundary>
            <ErrorBoundary>
              <ChatInput
                currentRoom={currentRoom}
                socket={socket}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
              />
            </ErrorBoundary>
          </div>
          
          {currentRoom === 'Game' && (
            <div ref={gamePanelRef} className="hidden lg:flex w-80 flex-col rounded-xl overflow-y-auto p-3 gap-3" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)' }}>
              <GamePanel channel={currentRoom} socket={socket ?? undefined} />
            </div>
          )}
        </div>

        {/* Users Sidebar - Desktop always visible, Mobile overlay */}
        <div className={`
          md:flex-shrink-0 md:relative md:translate-x-0
          fixed top-20 bottom-0 right-0 w-full sm:w-72 md:w-auto z-40 transform transition-transform duration-300 ease-in-out
          ${showUsers ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <div className="h-full md:h-auto">
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
                    user: { _id: string; username: string; avatarUrl?: string; sexe?: string };
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
      <MusicPlayer />
    </div>
  );
};

export default ChatPage;
