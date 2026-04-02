'use client';

import React, { useState, useEffect } from 'react';
import { reportService } from '@/services/reportService';
import toast from 'react-hot-toast';

interface BlockedUser {
  _id: string;
  username: string;
}

const BlockedUsers: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      console.log('🔍 Chargement des utilisateurs bloqués...');
      const users = await reportService.getBlockedUsers();
      console.log('✅ Utilisateurs bloqués récupérés:', users);
      setBlockedUsers(users);
      setError(null);
    } catch (error: unknown) {
      console.error('❌ Erreur lors du chargement des utilisateurs bloqués:', error);
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = e.response?.data?.message || e.message || 'Erreur lors du chargement';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    try {
      await reportService.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(user => user._id !== userId));
      toast.success(`${username} a été débloqué`);
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      const errorMessage = e.response?.data?.message || 'Erreur lors du déblocage';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Chargement des utilisateurs bloqués...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-xl">⚠️</span>
        </div>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
        <button 
          onClick={loadBlockedUsers}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Utilisateurs bloqués ({blockedUsers.length})
      </h3>
      
      {blockedUsers.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">Aucun utilisateur bloqué</p>
      ) : (
        <div className="space-y-2">
          {blockedUsers.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {user.username}
              </span>
              <button
                onClick={() => handleUnblock(user._id, user.username)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Débloquer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedUsers;