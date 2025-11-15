'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatChannel from '@/components/chat/ChatChannel';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/ChatInput';
import GamePanel from '@/components/Game/GamePanel';
import axiosInstance from '@/utils/axiosInstance';
import UsersOnline from '@/components/chat/UsersOnline';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoom, setCurrentRoom] = useState('General');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const previousRoomRef = useRef<string | null>(null);



  const loadRoomMessages = async () => {
    if (!currentRoom) return;
    
    try {
      const res = await axiosInstance.get(`/messages/${currentRoom}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000');
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !currentRoom) return;
    
    if (previousRoomRef.current) {
      socket.emit('leave_room', previousRoomRef.current);
    }
    
    socket.emit('join_room', currentRoom);
    previousRoomRef.current = currentRoom;
    
    return () => {
      socket.emit('leave_room', currentRoom);
    };
  }, [currentRoom, socket]);

  useEffect(() => {
    if (!socket) return;
    
    const handleReceive = (msg: Message) => {
      console.log('[CHAT] Message received:', msg);
      if (msg.room === currentRoom) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    
    const handleGameError = (error: any) => {
      // Only log if error has meaningful content
      if (error && typeof error === 'object' && error.message) {
        console.error('[GAME] Game error:', error.message);
      } else if (error && Object.keys(error).length > 0) {
        console.error('[GAME] Game error:', error);
      }
      // Silently ignore empty error objects
    };
    
    socket.on('receive_message', handleReceive);
    socket.on('game_error', handleGameError);
    
    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('game_error', handleGameError);
    };
  }, [socket, currentRoom]);
  useEffect(() => {
    if (socket && user?.username) {
      socket.emit('user_connected', user.username);
    }
  }, [socket, user?.username]);
  useEffect(() => { loadRoomMessages(); }, [currentRoom]);

  const handleJoinRoom = (roomName: string) => {
    setMessages([]);
    setCurrentRoom(roomName);
    setReplyTo(null); // Clear reply when changing rooms
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const [showChannels, setShowChannels] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark">
      <ChatHeader users={user || undefined} socket={socket} />
      
      {/* Mobile: Floating action buttons */}
      <div className="md:hidden fixed bottom-20 left-4 z-30 flex flex-col gap-2">
        <button
          onClick={() => setShowChannels(!showChannels)}
          className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Toggle channels"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => setShowUsers(!showUsers)}
          className="w-12 h-12 bg-gradient-to-r from-accent-500 to-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Toggle users"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
      </div>

      <div className="flex h-[calc(100vh-80px)] gap-2 p-2 relative">
        {/* Channel Sidebar - Desktop always visible, Mobile overlay */}
        <div className={`
          md:flex-shrink-0 md:relative md:translate-x-0
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
          ${showChannels ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="h-full md:h-auto md:mt-0 mt-20">
            <ChatChannel onJoinRoom={handleJoinRoom} currentRoom={currentRoom} socket={socket} />
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
          <div className="flex flex-col flex-1 bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-lg min-w-0">
            <ChatMessage currentRoom={currentRoom} socket={socket} onReply={handleReply} />
            <ChatInput 
              currentRoom={currentRoom} 
              socket={socket} 
              replyTo={replyTo}
              onCancelReply={handleCancelReply}
            />
          </div>
          
          {/* GamePanel seulement pour le canal Game - Hidden on mobile */}
          {currentRoom === 'Game' && (
            <div className="hidden lg:block w-80 bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-300 dark:border-white/20 rounded-xl overflow-hidden shadow-lg">
              <div className="p-3 h-full overflow-y-auto">
                <GamePanel channel={currentRoom} socket={socket} />
              </div>
            </div>
          )}
        </div>

        {/* Users Sidebar - Desktop always visible, Mobile overlay */}
        <div className={`
          md:flex-shrink-0 md:relative md:translate-x-0
          fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out
          ${showUsers ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <div className="h-full md:h-auto md:mt-0 mt-20">
            <UsersOnline socket={socket} currentRoom={currentRoom} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;