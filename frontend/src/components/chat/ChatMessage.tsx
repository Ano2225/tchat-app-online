'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';

interface Message {
  _id: string;
  sender: {
    id: string,
    username : string,
    email?: string,
  };
  content: string;
  createdAt: string;
}

interface ChatMessagesProps {
  currentRoom: string;
  socket: Socket | null; 
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ currentRoom, socket }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const user = useAuthStore((state) => state.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Charger les anciens messages à l’entrée dans une room
  useEffect(() => {
    if (!currentRoom) return;

    axiosInstance
      .get(`/messages/${currentRoom}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));
  }, [currentRoom]);

  // Gérer la réception de messages via le socket
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      if (message && message.content && message.sender) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!socket) {
    return <div className="p-4">Connexion au chat...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
     {messages.length > 0 ? (
         messages.map((msg) => (
            <div
              key={msg._id}
              className={`p-2 rounded max-w-md ${
                msg.sender.id === user?.id
                  ? 'bg-blue-100 text-right ml-auto'
                  : 'bg-gray-200 text-left'
              }`}
            >
              <div className="text-sm font-semibold text-gray-600">{msg.sender.username}</div>
              <div className="text-base text-black/60">{msg.content}</div>
              <div className="text-xs text-gray-400">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))
     ): (
       <p className='text-gray-400'> Aucun message , commencez la discussion </p>
     )
     }
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
