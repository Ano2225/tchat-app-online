import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, User, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ProfileModal from '../userProfil/ProfilModal';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import PrivateChatBox from './PrivateChatBox';
import toast from 'react-hot-toast';

interface ChatHeaderProps {
  users?: {
    id: string;
    username: string;
    email?: string;
  };
  socket: Socket | null;
}

interface Conversation {
  id: string;
  user: string;
  lastMessage: string;
  hasNewMessages?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ users, socket }) => {
  const { user, logout } = useAuthStore();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const openProfileModal = () => setShowProfileModal(true);
  const closeProfileModal = () => setShowProfileModal(false);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await axiosInstance.get(`/messages/conversations/${user.id}`);
      const data = response.data;

      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = data.map((conv: any) => ({
          id: conv.user._id,
          user: conv.user.username,
          lastMessage: conv.lastMessage.content,
          hasNewMessages: conv.hasNewMessages || false
        }));
        
        // Vérifier s'il y a des nouveaux messages
        const hasAnyNewMessages = formatted.some(conv => conv.hasNewMessages);
        setHasNewMessage(hasAnyNewMessages);
        
        setConversations(formatted);
      } else {
        console.error('La réponse des conversations n\'est pas un tableau:', data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations :', error);
    }
  }, [user]);

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowConversations(false);
    
    // Marquer cette conversation comme lue
    markConversationAsRead(conversation.id);
    
    // Mettre à jour l'état local
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversation.id ? { ...conv, hasNewMessages: false } : conv
      )
    );
    
    // Vérifier s'il reste des conversations non lues
    const stillHasNewMessages = conversations.some(
      conv => conv.id !== conversation.id && conv.hasNewMessages
    );
    setHasNewMessage(stillHasNewMessages);
  };

  // Fonction pour marquer une conversation comme lue
  const markConversationAsRead = async (conversationId: string) => {
    if (!user?.id) return;
    try {
      await axiosInstance.post(`/messages/mark-as-read`, {
        userId: user.id,
        conversationId: conversationId
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la conversation comme lue:', error);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Mettre en place un intervalle pour rafraîchir régulièrement
    const refreshInterval = setInterval(fetchConversations, 10000); // Rafraîchir toutes les 10 secondes
    
    return () => clearInterval(refreshInterval);
  }, [fetchConversations, user]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: {
      from: { _id: string; username: string };
      content: string;
      createdAt: string;
    }) => {
      toast.success(`📩 Nouveau message de ${data.from.username} : "${data.content}"`, {
        duration: 5000,
        position: 'bottom-right',
      });
      
      // Marquer qu'il y a un nouveau message
      setHasNewMessage(true);
      
      // Rafraîchir immédiatement les conversations
      fetchConversations();
    };

    socket.on('notify_user', handleNotification);
    
    // S'assurer que la connexion socket est active
    socket.on('connect', () => {
      console.log('Socket connecté');
      if (user?.id) {
        socket.emit('register_user', user.id);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Socket déconnecté');
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
              onClick={openProfileModal}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-300 cursor-pointer"
              onClick={openProfileModal}
            >
              <User size={20} className="text-blue-500" />
            </div>
          )}
          <h2 className="text-xl font-bold text-black">
            👋 Salut {users?.username || 'Visiteur'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowConversations(!showConversations);
            }}
            className="relative flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600"
          >
            <MessageCircle size={18} />
            Messages
            {hasNewMessage && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full">
                {/* Un élément fixe pour le badge */}
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              </span>
            )}
          </button>

          <button
            onClick={openProfileModal}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            <User size={18} />
            Voir profil
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
          >
            <LogOut size={18} />
            Déconnexion
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
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-2">Aucune conversation</p>
            )}
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal user={user || {}} onClose={closeProfileModal} socket={socket} />
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