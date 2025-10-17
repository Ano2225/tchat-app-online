'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatChannel from '@/components/chat/ChatChannel';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/ChatInput';
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
  replyTo?: Message;
  reactions?: Array<{
    emoji: string;
    users: string[];
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
    const newSocket = io('http://localhost:8000');
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
      if (msg.room === currentRoom) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    
    socket.on('receive_message', handleReceive);
    return () => {
      socket.off('receive_message', handleReceive);
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
    <div className="h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark">
      <ChatHeader users={user || undefined} socket={socket} />
      <div className="flex h-[calc(100vh-80px)] gap-1 p-1">
        <div className="flex-shrink-0">
          <ChatChannel onJoinRoom={handleJoinRoom} currentRoom={currentRoom} />
        </div>
        <div className="flex flex-col flex-1 bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl overflow-hidden">
          <ChatMessage currentRoom={currentRoom} socket={socket} onReply={handleReply} />
          <ChatInput 
            currentRoom={currentRoom} 
            socket={socket} 
            replyTo={replyTo}
            onCancelReply={handleCancelReply}
          />
        </div>
        <div className="flex-shrink-0">
          <UsersOnline socket={socket} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;