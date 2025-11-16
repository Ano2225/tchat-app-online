import React from 'react';
import { User, UserCheck, Heart } from 'lucide-react';

export const getGenderColor = (sexe: string): string => {
  switch (sexe) {
    case 'homme':
      return 'from-blue-500 to-blue-600';
    case 'femme':
      return 'from-pink-500 to-pink-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

export const getGenderIconSVG = (sexe: string, size: string = 'md'): JSX.Element => {
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-6 h-6'
  };
  
  const sizeClass = iconSizes[size as keyof typeof iconSizes] || iconSizes.md;
  
  switch (sexe) {
    case 'homme':
      return (
        <svg className={sizeClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.5 8.5c0 1.93-1.57 3.5-3.5 3.5S8.5 10.43 8.5 8.5 10.07 5 12 5s3.5 1.57 3.5 3.5zM19 3h-4v2h1.59l-3.09 3.09c-.78-.78-1.86-1.09-2.91-1.09-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-1.05-.31-2.13-1.09-2.91L16.59 5H19V3z"/>
        </svg>
      );
    case 'femme':
      return (
        <svg className={sizeClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.14 2 5 5.14 5 9s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm-1 2v3H9v2h2v3h2v-3h2v-2h-2v-3h-2z"/>
        </svg>
      );
    default:
      return (
        <svg className={sizeClass} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
};

export const getGenderIcon = (sexe: string, size?: string): JSX.Element => {
  return getGenderIconSVG(sexe, size);
};

export const getGenderBorderColor = (sexe: string): string => {
  switch (sexe) {
    case 'homme':
      return 'border-blue-400';
    case 'femme':
      return 'border-pink-400';
    default:
      return 'border-gray-400';
  }
};