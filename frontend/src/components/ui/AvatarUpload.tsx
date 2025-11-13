import React, { useState, useRef } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarUpdate: (avatarUrl: string | null) => void;
  className?: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  currentAvatar, 
  onAvatarUpdate, 
  className = "" 
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, updateUser } = useAuthStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    // Créer un aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload du fichier
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      // Upload vers Cloudinary
      const formData = new FormData();
      formData.append('media', file);
      
      const uploadResponse = await axiosInstance.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const avatarUrl = uploadResponse.data.url;

      // Mettre à jour l'avatar de l'utilisateur
      const updateResponse = await axiosInstance.put('/user/avatar', {
        avatarUrl
      });

      // Mettre à jour le store local
      if (user) {
        updateUser({ ...user, avatarUrl });
      }

      onAvatarUpdate(avatarUrl);
      toast.success('Avatar mis à jour avec succès!');
      setPreview(null);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'upload');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      await axiosInstance.put('/user/avatar', { avatarUrl: null });
      
      if (user) {
        updateUser({ ...user, avatarUrl: undefined });
      }
      
      onAvatarUpdate(null);
      toast.success('Avatar supprimé');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {className.includes('absolute') ? (
        // Mode bouton overlay
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
          title="Changer l'avatar"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      ) : (
        // Mode complet
        <>
          <div className="relative group">
            {/* Avatar actuel ou aperçu */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-lg">
              {preview ? (
                <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
              ) : currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user?.username?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>

            {/* Overlay avec boutons */}
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    title="Changer l'avatar"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  
                  {(currentAvatar || preview) && (
                    <button
                      onClick={removeAvatar}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-colors"
                      title="Supprimer l'avatar"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cliquez pour changer votre avatar
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              JPG, PNG • Max 5MB
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AvatarUpload;