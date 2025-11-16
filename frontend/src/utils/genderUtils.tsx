import React from 'react';

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

export const getGenderIconSVG = (sexe: string): JSX.Element => {
  switch (sexe) {
    case 'homme':
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 9c0-3.86 3.14-7 7-7s7 3.14 7 7-3.14 7-7 7-7-3.14-7-7zM21 3h-6v2h3.59l-2.59 2.59c-1.05-.68-2.28-1.09-3.59-1.09C8.14 6.5 5 9.64 5 13.5S8.14 20.5 12.41 20.5s7.41-3.14 7.41-7S16.68 6.91 15.41 6.09L18 3.5V7h2V3z"/>
        </svg>
      );
    case 'femme':
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.14 2 5 5.14 5 9s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm-1 2v3H9v2h2v3h2v-3h2v-2h-2v-3h-2z"/>
        </svg>
      );
    default:
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
};

export const getGenderIcon = (sexe: string): string => {
  switch (sexe) {
    case 'homme':
      return '👨';
    case 'femme':
      return '👩';
    default:
      return '👤';
  }
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