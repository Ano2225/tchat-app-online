'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';

interface User {
  _id: string;
  username: string;
  email: string;
  isBlocked: boolean;
  createdAt: string;
}

interface Channel {
  _id: string;
  name: string;
  createdAt: string;
}

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'channels'>('users');
  const [newChannelName, setNewChannelName] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/chat');
      return;
    }
    fetchUsers();
    fetchChannels();
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await axiosInstance.get('/channels');
      setChannels(response.data);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const toggleUserBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/block`, { isBlocked: !isBlocked });
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user block:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      await axiosInstance.post('/admin/channels', { name: newChannelName });
      setNewChannelName('');
      fetchChannels();
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce canal ?')) return;
    try {
      await axiosInstance.delete(`/admin/channels/${channelId}`);
      fetchChannels();
    } catch (error) {
      console.error('Error deleting channel:', error);
    }
  };

  if (!user || user.role !== 'admin') {
    return <div>Accès refusé</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard Admin</h1>
        
        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'users'
                ? 'bg-orange-400 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Utilisateurs ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'channels'
                ? 'bg-orange-400 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Canaux ({channels.length})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Gestion des utilisateurs</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Utilisateur</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Email</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Statut</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Inscription</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{user.username}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isBlocked 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {user.isBlocked ? 'Bloqué' : 'Actif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleUserBlock(user._id, user.isBlocked)}
                            className={`px-3 py-1 rounded text-xs ${
                              user.isBlocked
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                            }`}
                          >
                            {user.isBlocked ? 'Débloquer' : 'Bloquer'}
                          </button>
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gestion des canaux</h2>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Nom du nouveau canal"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={createChannel}
                  className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500"
                >
                  Créer
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Nom</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Créé le</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((channel) => (
                    <tr key={channel._id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">#{channel.name}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(channel.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteChannel(channel._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;