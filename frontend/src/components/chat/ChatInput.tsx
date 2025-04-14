'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/utils/axiosInstance';
import { Socket } from 'socket.io-client';

interface ChatInputProps {
  currentRoom: string;
  socket: Socket | null;
}

const ChatInput: React.FC<ChatInputProps> = ({ currentRoom, socket }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const user = useAuthStore((state) => state.user);
  console.log("user depuis le store:", user);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!socket || !message.trim()) return;

    const newMessage = {
      sender: user?.id || null,
      content: message.trim(),
      room: currentRoom,
    };

    try {
      setIsSending(true);
      await axiosInstance.post('/messages', newMessage);
      socket.emit('send_message', newMessage);
      setMessage('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSendMessage}
      className="flex items-center border-t px-4 py-2 bg-white"
    >
      <input
        type="text"
        placeholder={`Message dans #${currentRoom}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 p-2 border rounded mr-2 text-black"
      />
      <button
        type="submit"
        disabled={isSending}
        className={`bg-blue-500 text-white px-4 py-2 rounded ${
          isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
        }`}
      >
        Envoyer
      </button>
    </form>
  );
};

export default ChatInput;
