import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, User, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ProfileModal from '../userProfil/ProfilModal';
import { Socket } from 'socket.io-client';
import PrivateChatBox from './PrivateChatBox';
import toast from 'react-hot-toast';
import chatService, { Conversation, MessageNotification } from '@/services/chatServices';

interface ChatHeaderProps {
  users?: {
    id: string;
    username: string;
    email?: string;
  };
  socket: Socket | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ users, socket }) => {
  const { user, logout } = useAuthStore();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    
    const fetchedConversations = await chatService.fetchConversations(user.id);
    const hasAnyNewMessages = fetchedConversations.some(conv => conv.hasNewMessages);
    
    setHasNewMessage(hasAnyNewMessages);
    setConversations(fetchedConversations);
    
    const totalUnread = fetchedConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    console.log('Total unread messages:', totalUnread);
  }, [user]);

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowConversations(false);
    
    // Mark conversation as read and update local state
    if (user?.id) {
      chatService.markConversationAsRead(user.id, conversation.id);
    }
    
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversation.id ? { ...conv, hasNewMessages: false, unreadCount: 0 } : conv
      )
    );
    
    // Check if there are still unread conversations
    const stillHasNewMessages = conversations.some(
      conv => conv.id !== conversation.id && conv.hasNewMessages
    );
    setHasNewMessage(stillHasNewMessages);
  };

  useEffect(() => {
    fetchConversations();
    
    // Set refresh interval
    const refreshInterval = setInterval(fetchConversations, 10000);
    return () => clearInterval(refreshInterval);
  }, [fetchConversations, user]);

  useEffect(() => {
    if (!socket) return;
  
    const handleNotification = (data: MessageNotification) => {
      toast.success(`📩Nouveau message de ${data.from.username}"`, {
        duration: 5000,
        position: 'bottom-right',
      });
      
      setHasNewMessage(true);
      
      // Update message counter for this conversation
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === data.from._id 
            ? { 
                ...conv, 
                hasNewMessages: true, 
                unreadCount: (conv.unreadCount || 0) + 1, 
                lastMessage: data.content 
              } 
            : conv
        )
      );
      
      fetchConversations();
    };
  
    socket.on('notify_user', handleNotification);
    
    // Setup socket connection
    socket.on('connect', () => {
      console.log('Socket connected');
      if (user?.id) {
        socket.emit('register_user', user.id);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    return () => {
      socket.off('notify_user', handleNotification);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, fetchConversations, user]);

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 bg-gray-100 border-b">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 cursor-pointer"
              onClick={() => setShowProfileModal(true)}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-300 cursor-pointer"
              onClick={() => setShowProfileModal(true)}
            >
              <User size={20} className="text-blue-500" />
            </div>
          )}
          <h2 className="text-xl font-bold text-black">
            👋 Hello {users?.username || 'Visitor'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConversations(!showConversations)}
            className="relative flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600"
          >
            <MessageCircle size={18} />
            Messages
            {hasNewMessage && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white px-1">
                {conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)}
                <span className="absolute top-0 right-0 w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            <User size={18} />
            Profil
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
          >
            <LogOut size={18} />
            Deconnexion
          </button>
        </div>
      </div>

      {showConversations && (
        <div className="absolute top-16 z-50 left-0 right-0 bg-white shadow-lg rounded-lg max-h-60 overflow-auto">
          <h3 className="text-lg font-semibold px-4 py-2 border-b text-black">Conversations</h3>
          <div className="px-4 py-2 space-y-2 text-black">
            {conversations.length > 0 ? (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`cursor-pointer hover:bg-gray-100 p-2 rounded flex justify-between items-center ${
                    conversation.hasNewMessages ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium">{conversation.user}</p>
                    <p className="text-sm text-gray-500">{conversation.lastMessage}</p>
                  </div>
                  {conversation.hasNewMessages && (
                    <span className="flex items-center justify-center min-w-5 h-5 bg-red-500 rounded-full text-xs font-bold text-white px-1">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-2">No conversations</p>
            )}
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal user={user || {}} onClose={() => setShowProfileModal(false)} socket={socket} />
      )}

      {selectedConversation && (
        <PrivateChatBox
          recipient={{ _id: selectedConversation.id, username: selectedConversation.user }}
          socket={socket}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </>
  );
};

export default ChatHeader;