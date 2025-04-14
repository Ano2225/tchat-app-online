'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatChannel from '@/components/chat/ChatChannel';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/ChatInput';
import axiosInstance from '@/utils/axiosInstance';

interface Message {
  _id?: string;
  sender: string;
  content: string;
  room: string;
  createdAt?: string;
}

const ChatPage = () => {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoom, setCurrentRoom] = useState('General');
  const [socket, setSocket] = useState<Socket | null>(null);

  // Init socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:8000');
    setSocket(newSocket);
    newSocket.emit('join_room', 'General');

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Listen to incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('receive_message', handleReceive);

    return () => {
      socket.off('receive_message', handleReceive);
    };
  }, [socket]);

  // Load previous messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await axiosInstance.get(`/messages/${currentRoom}`);
        setMessages(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    if (currentRoom) {
      loadMessages();
    }
  }, [currentRoom]);

  const handleJoinRoom = (roomName: string) => {
    if (socket) {
      socket.emit('join_room', roomName);
    }
    setMessages([]);
    setCurrentRoom(roomName);
  };

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader user={user || undefined} />
      <div className="flex flex-1">
        <ChatChannel onJoinRoom={handleJoinRoom} currentRoom={currentRoom} />
        <div className="flex flex-col flex-1">
          <ChatMessage currentRoom={currentRoom} socket={socket} />
          <ChatInput currentRoom={currentRoom} socket={socket} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
