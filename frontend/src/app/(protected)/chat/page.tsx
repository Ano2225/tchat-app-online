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
      if (error && Object.keys(error).length > 0) {
        console.error('[GAME] Game error:', error);
      }
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

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark">
      <ChatHeader users={user || undefined} socket={socket} />
      <div className="flex h-[calc(100vh-80px)] gap-2 p-2">
        <div className="flex-shrink-0">
          <ChatChannel onJoinRoom={handleJoinRoom} currentRoom={currentRoom} />
        </div>
        <div className="flex flex-1 gap-2">
          {/* Chat principal */}
          <div className="flex flex-col flex-1 bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-400 dark:border-white/20 rounded-xl overflow-hidden shadow-lg">
            <ChatMessage currentRoom={currentRoom} socket={socket} onReply={handleReply} />
            <ChatInput 
              currentRoom={currentRoom} 
              socket={socket} 
              replyTo={replyTo}
              onCancelReply={handleCancelReply}
            />
          </div>
          
          {/* GamePanel seulement pour le canal Game */}
          {currentRoom === 'Game' && (
            <div className="w-80 bg-white dark:bg-white/10 backdrop-blur-xl border border-gray-400 dark:border-white/20 rounded-xl overflow-hidden shadow-lg">
              <div className="p-3 h-full overflow-y-auto">
                <GamePanel channel={currentRoom} socket={socket} />
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <UsersOnline socket={socket} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;