import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/utils/axiosInstance';
import BlockedUsers from '@/components/settings/BlockedUsers';
import GenderAvatar from '@/components/ui/GenderAvatar';
import AvatarUpload from '@/components/ui/AvatarUpload';
import { Settings, User, UserX, X, Lock, Eye, EyeOff } from 'lucide-react';

// Composant pour le changement de mot de passe
const PasswordChangeSection: React.FC = () => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({type: 'error', text: 'Les mots de passe ne correspondent pas'});
      return;
    }

    if (passwords.newPassword.length < 6) {
      setMessage({type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères'});
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      
      setMessage({type: 'success', text: 'Mot de passe modifié avec succès'});
      setPasswords({currentPassword: '', newPassword: '', confirmPassword: ''});
      setShowPasswordForm(false);
    } catch (error: any) {
      setMessage({type: 'error', text: error.response?.data?.message || 'Erreur lors du changement'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-900 dark:text-white" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sécurité</h3>
        </div>
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors"
        >
          {showPasswordForm ? 'Annuler' : 'Changer le mot de passe'}
        </button>
      </div>

      {message && (
        <div className={`text-xs p-2 rounded mb-3 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {showPasswordForm && (
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              placeholder="Mot de passe actuel"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords(prev => ({...prev, currentPassword: e.target.value}))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({...prev, current: !prev.current}))}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              placeholder="Nouveau mot de passe"
              value={passwords.newPassword}
              onChange={(e) => setPasswords(prev => ({...prev, newPassword: e.target.value}))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({...prev, new: !prev.new}))}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              placeholder="Confirmer le nouveau mot de passe"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords(prev => ({...prev, confirmPassword: e.target.value}))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({...prev, confirm: !prev.confirm}))}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      )}
    </div>
  );
};

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'blocked'>('profile');

  const handleAvatarUpdate = (avatarUrl: string | null) => {
    if (user) {
      updateUser({ ...user, avatarUrl: avatarUrl || undefined });
    }
  };
  
  // Si isAnonymous est undefined, l'utilisateur est inscrit
  if (user?.isAnonymous === true) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profil</h2>
          <div className="text-center mb-4">
            <GenderAvatar
              username={user?.username || ''}
              avatarUrl={user?.avatarUrl}
              sexe={user?.sexe}
              size="lg"
              className="w-16 h-16 mx-auto mb-2"
              clickable={false}
            />
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Inscrivez-vous pour personnaliser votre profil
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto z-[9999] animate-in fade-in-0 zoom-in-95 duration-300">
        
        {/* Header avec gradient */}
        <div className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 p-6 text-center rounded-t-2xl">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">Paramètres</h2>
          </div>
          <p className="text-white/80 text-sm">Personnalisez votre profil</p>
        </div>

        {/* Onglets modernes */}
        <div className="p-6 pb-0">
          <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              Profil
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'blocked'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <UserX className="w-4 h-4" />
              Bloqués
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="px-6 pb-6">
          
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Section Avatar */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <User className="w-4 h-4 text-gray-900 dark:text-white" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Avatar</h3>
                </div>
                <div className="flex justify-center mb-4">
                  <GenderAvatar
                    username={user?.username || ''}
                    avatarUrl={user?.avatarUrl}
                    sexe={user?.sexe}
                    size="lg"
                    className="w-24 h-24"
                    clickable={false}
                  />
                </div>
                <AvatarUpload onAvatarUpdate={handleAvatarUpdate} />
              </div>

              {/* Informations personnelles */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Informations personnelles</h3>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Nom d'utilisateur</span>
                    <p className="font-medium text-gray-900 dark:text-white">{user?.username}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Email</span>
                    <p className="font-medium text-gray-900 dark:text-white">{(user as any)?.email || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Âge</span>
                    <p className="font-medium text-gray-900 dark:text-white">{user?.age || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Sexe</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.sexe === 'male' ? 'Homme' : user?.sexe === 'female' ? 'Femme' : user?.sexe === 'autre' ? 'Autre' : 'Non renseigné'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Ville</span>
                    <p className="font-medium text-gray-900 dark:text-white">{user?.ville || 'Non renseignée'}</p>
                  </div>
                </div>
              </div>

              {/* Section changement de mot de passe */}
              <PasswordChangeSection />
            </div>
          ) : (
            <BlockedUsers />
          )}
        </div>

      </div>
    </>
  );
};

export default ProfileModal;