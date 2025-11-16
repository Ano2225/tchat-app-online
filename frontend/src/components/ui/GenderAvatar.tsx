import React from 'react';
import { getGenderColor, getGenderIcon, getGenderBorderColor } from '@/utils/genderUtils';

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

interface GenderAvatarProps {
  username: string;
  avatarUrl?: string;
  sexe?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const GenderAvatar: React.FC<GenderAvatarProps> = ({
  username,
  avatarUrl,
  sexe = 'autre',
  size = 'md',
  onClick,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-full shadow-sm hover:scale-110 transition-transform cursor-pointer overflow-hidden border-2 ${getGenderBorderColor(sexe)} ${className}`}
      title="Voir le profil"
    >
      {avatarUrl && avatarUrl.startsWith('http') ? (
        <div className="relative w-full h-full">
          <img 
            src={avatarUrl.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/')} 
            alt={username}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 rounded-full"></div>
          <div className={`absolute bottom-0 right-0 text-white ${iconSizes[size]}`}>
            {getGenderIcon(sexe)}
          </div>
        </div>
      ) : (
        <div className={`w-full h-full bg-gradient-to-r ${getGenderColor(sexe)} flex items-center justify-center relative`}>
          <span className={`${textSizes[size]} font-bold text-white`}>
            {getInitials(username)}
          </span>
          <div className={`absolute bottom-0 right-0 text-white ${iconSizes[size]}`}>
            {getGenderIcon(sexe)}
          </div>
        </div>
      )}
    </button>
  );
};

export default GenderAvatar;