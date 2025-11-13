import React, { useEffect, useState } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import PrivateChatBox from '../chat/PrivateChatBox';
import ReportModal from '@/components/ui/ReportModal';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';

interface Props {
  userId: string;
  socket: Socket | null;
  onClose: () => void;
}

const UserSelectedModal: React.FC<Props> = ({ userId, socket, onClose }) => {
  const { profile, loading, error, fetchProfile, clearProfile } = useUserProfileStore();
  const [showChat, setShowChat] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleClose = () => {
    onClose();
    clearProfile();
    setShowChat(false);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetch = async () => {
      await fetchProfile(userId);
      if (isCancelled) return;
    };

    if (userId && userId !== profile?._id) {
      fetch();
    }

    return () => {
      isCancelled = true;
    };
  }, [userId, fetchProfile, profile?._id]);

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl z-50">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Chargement du profil...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={handleClose} />
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl z-50">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">⚠️</span>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
            <button 
              onClick={handleClose} 
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!profile) return null;

  if (showChat) {
    return <PrivateChatBox recipient={profile} socket={socket} onClose={onClose} />;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={handleClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-80 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative p-6 text-center">
          <button 
            onClick={handleClose} 
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Avatar avec gradient */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-2xl font-bold text-white">
              {profile.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-1">
            {profile.username}
          </h3>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">En ligne</span>
          </div>
        </div>

        {/* Infos avec icônes */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <span className="text-sm">🎂</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Âge</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{profile.age || 'Non renseigné'}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <span className="text-sm">{profile.sexe === 'homme' ? '👨' : profile.sexe === 'femme' ? '👩' : '👤'}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sexe</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{profile.sexe || 'Non renseigné'}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <span className="text-sm">📍</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ville</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{profile.ville || 'Non renseignée'}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-6 pt-0 space-y-3">
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Envoyer un message</span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex-1 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-800/40 text-orange-600 dark:text-orange-400 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Signaler</span>
            </button>
            
            <button
              onClick={async () => {
                try {
                  await axiosInstance.post(`/reports/block/${profile._id}`);
                  toast.success(`${profile.username} a été bloqué`);
                  handleClose();
                } catch (error: any) {
                  toast.error(error.response?.data?.message || 'Erreur lors du blocage');
                }
              }}
              className="flex-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
              <span>Bloquer</span>
            </button>
          </div>
        </div>
        
        {showReportModal && (
          <ReportModal
            targetUserId={profile._id}
            username={profile.username}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </div>
    </>
  );
};

export default UserSelectedModal;