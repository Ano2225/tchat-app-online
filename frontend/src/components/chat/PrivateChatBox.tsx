import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import chatService from '@/services/chatServices';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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
  const [isRecipientOnline, setIsRecipientOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Effect to fetch messages and join the private room
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id) return;

      try {
        const fetchedMessages = await chatService.getPrivateMessages(user.id, recipient._id);
        setMessages(fetchedMessages);
        scrollToBottom();

        // Mark messages as read after loading
        if (fetchedMessages.length > 0) {
          await chatService.markConversationAsRead(user.id, recipient._id);
        }
      } catch (error) {
        console.error('Error fetching private messages:', error);
      }
    };

    fetchMessages();

    if (socket && user?.id) {
      socket.emit('join_private_room', {
        senderId: user.id,
        recipientId: recipient._id
      });

      // Verify if the user is online
      socket.emit('check_user_online', recipient._id);
    }
  }, [user, recipient, socket]);

  // Effect to handle Socket.IO events
  useEffect(() => {
    if (!socket || !recipient?._id || !user?.id) return;

    const handleReceiveMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    };

    const handleUserOnline = (userId: string) => {
      if (userId === recipient._id) setIsRecipientOnline(true);
    };

    const handleUserOffline = (userId: string) => {
      if (userId === recipient._id) setIsRecipientOnline(false);
    };

    // Listener for the 'messages_read' event
    const handleMessagesRead = ({ readerId, senderId }: { readerId: string; senderId: string }) => {
      // Update the 'read' status of messages sent by the current user
      // when the recipient has read the messages.
      if (readerId === recipient._id && senderId === user.id) {
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.sender._id === user.id ? { ...msg, read: true } : msg
          )
        );
      }
    };

    socket.on('receive_private_message', handleReceiveMessage);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('receive_private_message', handleReceiveMessage);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('messages_read', handleMessagesRead); 
    };
  }, [socket, recipient, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id || !socket) return;

    try {
      await chatService.sendPrivateMessage(newMessage, user.id, recipient._id);
      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Function to add an emoji
  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setNewMessage(prevMessage => prevMessage + emojiObject.emoji);
  };

  // Handle click outside the emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-6 w-80 bg-white shadow-lg rounded-t-lg z-50 border border-gray-200">
      {/* Chat header */}
      <div className="bg-blue-500 text-white p-3 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-medium">{recipient.username}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isRecipientOnline ? 'bg-green-400' : 'bg-gray-400'
            }`}
            title={isRecipientOnline ? 'Online' : 'Offline'}
          />
        </div>
        <button onClick={onClose} className="p-1 hover:bg-blue-600 rounded">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
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
              {/* Display "Seen" status */}
              {message.sender._id === user?.id && (
                <span className="ml-2 text-xs">
                  {message.read ? 'Vu' : 'Envoyé'}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t flex relative">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(prev => !prev)}
          className="p-2 hover:bg-gray-100 rounded mr-2"
        >
          <Smile size={18} />
        </button>
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

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-0">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}
      </form>
    </div>
  );
};

export default PrivateChatBox;