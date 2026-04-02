import React, { useState, useRef } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Camera, Trash2 } from 'lucide-react';

interface AvatarUploadProps {
  onAvatarUpdate: (avatarUrl: string | null) => void;
  className?: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ onAvatarUpdate, className = "" }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, updateUser } = useAuthStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    console.log('Début upload avatar:', file.name);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      
      console.log('📤 Upload vers /upload...');
      const uploadResponse = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('✅ Upload réussi:', uploadResponse.data);

      const avatarUrl = uploadResponse.data.url;

      console.log('📤 Mise à jour avatar vers /user/avatar...');
      await axiosInstance.put('/user/avatar', { avatarUrl });
      console.log('✅ Avatar mis à jour en base');

      if (user) {
        updateUser({ ...user, avatarUrl });
        console.log('✅ Store mis à jour');
      }

      onAvatarUpdate(avatarUrl);
      toast.success('Avatar mis à jour !');
    } catch (error: unknown) {
      console.error('❌ Erreur upload:', error);
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Erreur lors de l\'upload');
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
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className={`${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex space-x-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Upload...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Changer
            </div>
          )}
        </button>
        
        {user?.avatarUrl && (
          <button
            onClick={removeAvatar}
            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;