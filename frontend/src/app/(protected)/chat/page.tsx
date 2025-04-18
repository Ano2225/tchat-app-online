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
  _id?: string;
  sender: {
    id: string,
    username : string,
    email?: string,
  }; 
  content: string;
  room: string;
  createdAt?: string;
}

const ChatPage = () => {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoom, setCurrentRoom] = useState('General');
  const [socket, setSocket] = useState<Socket | null>(null);

  const previousRoomRef = useRef<string | null>(null); 

  // Init socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:8000');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Rejoindre une room (et quitter l'ancienne)
  useEffect(() => {
    if (!socket || !currentRoom) return;

    if (previousRoomRef.current) {
      socket.emit('leave_room', previousRoomRef.current);
    }

    socket.emit('join_room', currentRoom); // Rejoint la nouvelle room
    previousRoomRef.current = currentRoom; // Mémorise la room actuelle

    return () => {
      socket.emit('leave_room', currentRoom); // Quitte la room quand le composant se démonte
    };
  }, [currentRoom, socket]);

  // Ecoute des messages entrants
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

  //Emettre que l'utilisateur est connecté 
  useEffect(() => {
    if (socket && user?.username) {
      socket.emit('user_connected', user.username);
    }
  }, [socket, user?.username]);

  // Charger les messages précédents
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
    setMessages([]); // Reset les messages quand on change de room
    setCurrentRoom(roomName); 
  };

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader users={user || undefined} socket={socket} />
      <div className="flex flex-1">
        <ChatChannel onJoinRoom={handleJoinRoom} currentRoom={currentRoom} />
        <div className="flex flex-col flex-1">
          <ChatMessage currentRoom={currentRoom} socket={socket} />
          <ChatInput currentRoom={currentRoom} socket={socket} />
        </div>
         <UsersOnline socket={socket} />
      </div>
    </div>
  );
};

export default ChatPage;
