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
    if (!name || typeof name !== 'string') return 'bg-gray-500';
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  } catch (error) {
    console.error('Error generating avatar:', error);
    return 'bg-gray-500';
  }
}