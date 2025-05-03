import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile, FilePlus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Socket } from 'socket.io-client';
import chatService from '@/services/chatServices';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import axiosInstance from '@/utils/axiosInstance';

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
  mediaUrl?: string;
  mediaType?: string; 
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Correct type and initialization

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return; 

    if (!user || !user.id) {
      console.error("User is not logged in or user ID is not available.");
      return; 
    }

    try {
      let mediaUrl = undefined;
      let mediaType = undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('media', selectedFile);
        const uploadResponse = await axiosInstance.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        mediaUrl = uploadResponse.data.url;
        mediaType = uploadResponse.data.media_type;
      }

      // Now send the message, including media if available
      await chatService.sendPrivateMessage(newMessage, user?.id, recipient._id, mediaUrl, mediaType);
      setNewMessage('');
      setSelectedFile(null);
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
              {/* Conditionally display media */}
              {message.mediaUrl && message.mediaType?.startsWith('image') && (
                <img src={message.mediaUrl} alt="Image" className="max-w-xs max-h-48 rounded-lg object-contain" />
              )}
              {message.mediaUrl && message.mediaType?.startsWith('video') && (
                <video controls src={message.mediaUrl} className="max-w-xs max-h-48 rounded-lg object-contain" />
              )}
              {/* Display text content if no media or in addition to media  */}
              {!message.mediaUrl && message.content}
              {message.mediaUrl && message.content && <p className="mt-2">{message.content}</p>}
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

      <form onSubmit={handleSendMessage} className="p-3 border-t flex relative items-center">
        <label htmlFor="file-upload" className="cursor-pointer p-2 hover:bg-gray-100 rounded mr-2">
          <FilePlus size={18} />
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

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

        {/* Display selected file name */}
        {selectedFile && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
            {selectedFile.name}
          </span>
        )}

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