import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) {
    return 'Aujourd\'hui'
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Hier'
  } else {
    return d.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    })
  }
}

export function sanitizeInput(input: string): string {
  try {
    if (typeof input !== 'string') return '';
    return input.replace(/[\r\n\t]/g, ' ').trim();
  } catch (error) {
    console.error('Error sanitizing input:', error);
    return '';
  }
}

export function generateAvatar(name: string): string {
  try {
    if (!name || typeof name !== 'string') return 'bg-gradient-to-r from-gray-500 to-gray-600';
    
    // Créer un hash simple du nom d'utilisateur
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Palette de couleurs prédéfinies pour les avatars
    const colorPalettes = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600', 
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-pink-500 to-pink-600',
      'bg-gradient-to-r from-indigo-500 to-indigo-600',
      'bg-gradient-to-r from-red-500 to-red-600',
      'bg-gradient-to-r from-yellow-500 to-yellow-600',
      'bg-gradient-to-r from-teal-500 to-teal-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-cyan-500 to-cyan-600'
    ];
    
    // Utiliser le hash pour sélectionner une couleur de manière cohérente
    const index = Math.abs(hash) % colorPalettes.length;
    return colorPalettes[index];
  } catch (error) {
    console.error('Error generating avatar:', error);
    return 'bg-gradient-to-r from-gray-500 to-gray-600';
  }
}