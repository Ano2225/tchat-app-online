import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';

interface PrivateChatBoxProps {
  recipient: {
    _id: string;
    username: string;
  };
  socket: Socket | null;
  onClose?: () => void;
}

const PrivateChatBox: React.FC<PrivateChatBoxProps> = ({ recipient, socket, onClose }) => {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll auto
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialisation du chat
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('join_private_room', {
      senderId: user.id,
      recipientId: recipient._id,
    });

    socket.emit('get_message_history', {
      userId: user.id,
      recipientId: recipient._id,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMessage = (msg: any) => {
      if (
        (msg.sender._id === recipient._id && msg.recipient === user.id) ||
        (msg.sender._id === user.id && msg.recipient === recipient._id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleHistory = (history: any[]) => {
      setMessages(history);
    };

    socket.on('receive_private_message', handleMessage);
    socket.on('message_history', handleHistory);

    return () => {
      socket.off('receive_private_message', handleMessage);
      socket.off('message_history', handleHistory);
    };
  }, [socket, recipient._id, user]);

  const handleSend = () => {
    if (!message.trim() || !socket || !user) return;

    const newMessage = {
      senderId: user.id,
      recipientId: recipient._id,
      content: message.trim(),
    };

    socket.emit('send_private_message', newMessage);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">Chat avec {recipient.username}</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            X
          </button>
        )}
      </div>

      <div className="h-64 overflow-y-auto border p-2 mb-2 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-1 ${msg.sender._id === user?.id ? 'text-right' : 'text-left'}`}
          >
            <span
              className={`inline-block px-3 py-1 rounded ${
                msg.sender._id === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300'
              }`}
            >
              {msg.content}
            </span>
            <span className="text-xs text-gray-500 block mt-1">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Écrivez un message..."
          className="flex-grow border rounded p-2 mr-2"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default PrivateChatBox;
