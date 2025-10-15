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

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const users = await reportService.getBlockedUsers();
      setBlockedUsers(users);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    try {
      await reportService.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(user => user._id !== userId));
      toast.success(`${username} a été débloqué`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors du déblocage';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
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