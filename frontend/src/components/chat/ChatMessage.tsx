'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';

interface Message {
  _id: string;
  sender: {
    _id: string | undefined;
    username: string;
    email?: string;
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
  console.log(messages)
  const user = useAuthStore((state) => state.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentRoom) return;

    axiosInstance
      .get(`/messages/${currentRoom}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));
  }, [currentRoom]);

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
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
      {messages.length > 0 ? (
        messages.map((msg) => {
            console.log(messages)
          const isOwnMessage = msg.sender._id === user?.id;
          console.log('USER ID:', user?.id);
          console.log('MSG SENDER ID:', msg.sender._id);


          return (
            <div
              key={msg._id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl p-3 max-w-xs sm:max-w-sm break-words shadow-md ${
                  isOwnMessage
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="text-sm font-semibold">
                  {isOwnMessage ? 'Vous' : msg.sender.username}
                </div>
                <div className="text-base">{msg.content}</div>
                <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-gray-400 text-center">Aucun message, commencez la discussion !</p>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
