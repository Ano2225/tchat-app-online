import React, { useEffect, useState } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import PrivateChatBox from '../chat/PrivateChatBox';
import ReportModal from '@/components/ui/ReportModal';
import { Socket } from 'socket.io-client';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import GenderAvatar from '@/components/ui/GenderAvatar';

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" onClick={handleClose} />
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl z-50 animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="loading-title">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span id="loading-title" className="text-sm font-medium text-gray-900 dark:text-white">Chargement du profil...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" onClick={handleClose} />
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl z-50 animate-scale-in" role="alert" aria-live="assertive">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
            <button 
              onClick={handleClose} 
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Close error dialog"
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" onClick={handleClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-80 max-w-[90vw] z-50 animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        {/* Header */}
        <div className="relative p-6 text-center">
          <button 
            onClick={handleClose} 
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close profile"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Avatar */}
          <div className="mx-auto mb-3">
            <GenderAvatar
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              sexe={profile.sexe}
              size="lg"
              className="w-20 h-20 shadow-lg"
            />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-1">
            {profile.username}
          </h3>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">En ligne</span>
          </div>
        </div>

        {/* Infos simples */}
        <div className="px-6 pb-6 text-center space-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {profile.age && <span>🎂 {profile.age} ans</span>}
            {profile.age && profile.ville && <span> • </span>}
            {profile.ville && <span>📍 {profile.ville}</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-6 pt-0 space-y-2">
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            💬 Envoyer un message
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ⚠️ Signaler
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
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🚫 Bloquer
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