/**
 * Génère une couleur d'avatar cohérente basée sur le nom d'utilisateur
 */
export const getAvatarColor = (username: string): string => {
  if (!username) return 'from-gray-500 to-gray-600';
  
  // Créer un hash simple du nom d'utilisateur
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Palette de couleurs prédéfinies pour les avatars
  const colorPalettes = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600', 
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-cyan-500 to-cyan-600'
  ];
  
  // Utiliser le hash pour sélectionner une couleur de manière cohérente
  const index = Math.abs(hash) % colorPalettes.length;
  return colorPalettes[index];
};

/**
 * Génère les initiales d'un nom d'utilisateur
 */
export const getInitials = (username: string): string => {
  if (!username) return '?';
  return username.charAt(0).toUpperCase();
};