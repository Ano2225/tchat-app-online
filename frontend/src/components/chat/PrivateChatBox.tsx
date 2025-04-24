import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import chatService from '@/services/chatServices';

interface PrivateChatBoxProps {
  recipient: {
    _id: string;
    username: string;
  };
  socket: Socket | null;
  onClose: () => void;
}

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
  };
  createdAt: string;
  read: boolean;
}

const PrivateChatBox: React.FC<PrivateChatBoxProps> = ({ recipient, socket, onClose }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch message history when component mounts
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id) return;
      
      try {
        const fetchedMessages = await chatService.getPrivateMessages(user.id, recipient._id);
        setMessages(fetchedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching private messages:', error);
      }
    };

    fetchMessages();

    // Join private room for real-time messaging
    if (socket && user?.id) {
      socket.emit('join_private_room', {
        senderId: user.id,
        recipientId: recipient._id
      });
    }
  }, [user, recipient, socket]);

  // Handle receiving messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    };

    socket.on('receive_private_message', handleReceiveMessage);

    return () => {
      socket.off('receive_private_message', handleReceiveMessage);
    };
  }, [socket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user?.id || !socket) return;

    try {
      // Send via socket for real-time delivery
      socket.emit('send_private_message', {
        senderId: user.id,
        recipientId: recipient._id,
        content: newMessage
      });

      // Also send via API for persistence
      await chatService.sendPrivateMessage(newMessage, user.id, recipient._id);
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="fixed bottom-0 right-6 w-80 bg-white shadow-lg rounded-t-lg z-50 border border-gray-200">
      {/* Chat header */}
      <div className="bg-blue-500 text-white p-3 rounded-t-lg flex justify-between items-center">
        <h3 className="font-medium">{recipient.username}</h3>
        <button onClick={onClose} className="p-1 hover:bg-blue-600 rounded">
          <X size={18} />
        </button>
      </div>

      {/* Messages container */}
      <div className="h-80 overflow-y-auto p-3 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`mb-2 ${message.sender._id === user?.id ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block p-2 rounded-lg max-w-[70%] ${
                message.sender._id === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.content}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border p-2 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default PrivateChatBox;