import React, { useState, useEffect, useRef } from 'react';
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
  media_url?: string;
  media_type?: string;
  createdAt: string;
  read: boolean;
}

const PrivateChatBox: React.FC<PrivateChatBoxProps> = ({ recipient, socket, onClose }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecipientOnline, setIsRecipientOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id) return;

      try {
        const fetchedMessages = await chatService.getPrivateMessages(user.id, recipient._id);
        setMessages(fetchedMessages);
        scrollToBottom();

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
      socket.emit('check_user_online', recipient._id);
    }
  }, [user, recipient, socket]);

  useEffect(() => {
    if (!socket || !recipient?._id || !user?.id) return;

    const handleReceiveMessage = (message: Message) => {
      console.log('Received message:', message);
      console.log('Message media_url:', message.media_url);
      console.log('Message media_type:', message.media_type);
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    };

    const handleUserOnline = (userId: string) => {
      if (userId === recipient._id) setIsRecipientOnline(true);
    };

    const handleUserOffline = (userId: string) => {
      if (userId === recipient._id) setIsRecipientOnline(false);
    };

    socket.on('receive_private_message', handleReceiveMessage);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('receive_private_message', handleReceiveMessage);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket, recipient, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user?.id || !socket) return;

    try {
      setUploading(true);
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

      const messageContent = newMessage.trim();
      if (!messageContent && !mediaUrl) {
        throw new Error('Message must contain text or media');
      }
      
      console.log('Sending message with media:', { messageContent, mediaUrl, mediaType });
      
      // Envoyer directement via socket
      socket.emit('send_private_message', {
        senderId: user.id,
        recipientId: recipient._id,
        content: messageContent,
        media_url: mediaUrl,
        media_type: mediaType,
      });
      
      setNewMessage('');
      setSelectedFile(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="fixed bottom-20 right-6 z-[9999]">
          <EmojiPicker onEmojiClick={(emojiObject: EmojiClickData) => {
            setNewMessage(prev => prev + emojiObject.emoji);
            setShowEmojiPicker(false);
          }} />
        </div>
      )}
      
      <div className="fixed bottom-0 right-4 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-2xl z-50 rounded-t-lg overflow-hidden">
        {/* Header */}
        <div className="bg-orange-400 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">{recipient.username.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="font-medium text-sm">{recipient.username}</div>
              <div className="flex items-center space-x-1 text-xs opacity-90">
                <div className={`w-2 h-2 rounded-full ${isRecipientOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span>{isRecipientOnline ? 'En ligne' : 'Hors ligne'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg">×</button>
        </div>

        {/* Messages */}
        <div className="h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Aucun message
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => {
                const isOwn = message.sender._id === user?.id;
                return (
                  <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                      isOwn 
                        ? 'bg-orange-400 text-white' 
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                    }`}>
                      {message.media_url && (
                        <div className="mb-2">
                          <img 
                            src={message.media_url.replace(/&#x2F;/g, '/').replace(/&amp;/g, '&')} 
                            alt="Image" 
                            className="max-w-[180px] h-auto rounded cursor-pointer" 
                            onClick={() => message.media_url && window.open(message.media_url.replace(/&#x2F;/g, '/').replace(/&amp;/g, '&'), '_blank')}
                          />
                        </div>
                      )}
                      {message.content && <div>{message.content}</div>}
                      <div className={`text-xs mt-1 ${isOwn ? 'text-orange-100' : 'text-gray-500'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isOwn && <span className="ml-1">{message.read ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-600 p-3">
          {selectedFile && (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center justify-between">
              <span>Image: {selectedFile.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-2 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              📎
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-2 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              😊
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
              className="bg-orange-400 text-white px-2 py-2 rounded text-sm hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateChatBox;