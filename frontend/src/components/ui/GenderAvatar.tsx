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
  clickable?: boolean;
}

const GenderAvatar: React.FC<GenderAvatarProps> = ({
  username,
  avatarUrl,
  sexe = 'autre',
  size = 'md',
  onClick,
  className = '',
  clickable = true
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

  const Component = clickable ? 'button' : 'div';
  
  return (
    <Component
      onClick={clickable ? onClick : undefined}
      className={`${sizeClasses[size]} rounded-full shadow-sm ${clickable ? 'hover:scale-110 cursor-pointer' : ''} transition-transform overflow-hidden border-2 ${getGenderBorderColor(sexe)} ${className}`}
      title={clickable ? "Voir le profil" : undefined}
    >
      {avatarUrl && avatarUrl.startsWith('http') ? (
        <div className="relative w-full h-full">
          <img 
            src={avatarUrl.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/')} 
            alt={username}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 rounded-full"></div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-600 shadow-sm ${
            sexe === 'homme' ? 'text-blue-600' : sexe === 'femme' ? 'text-pink-600' : 'text-gray-600'
          }`}>
            {getGenderIcon(sexe)}
          </div>
        </div>
      ) : (
        <div className={`w-full h-full bg-gradient-to-r ${getGenderColor(sexe)} flex items-center justify-center relative`}>
          <div className="text-white">
            {getGenderIcon(sexe, size)}
          </div>
        </div>
      )}
    </Component>
  );
};

export default GenderAvatar;