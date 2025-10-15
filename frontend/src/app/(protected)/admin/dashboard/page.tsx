'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import { Card } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminService, type DashboardStats, type Report } from '@/services/adminService';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  lastSeen?: string;
  isOnline: boolean;
  sexe?: string;
  age?: number;
  ville?: string;
  isAnonymous: boolean;
  isBlocked: boolean;
  isEnabled: boolean;
  createdAt: string;
}

interface Channel {
  _id: string;
  name: string;
  createdAt: string;
}

interface RecentActivity {
  _id: string;
  type: 'user_join' | 'message_sent' | 'user_reported' | 'user_blocked' | 'channel_created';
  description: string;
  timestamp: string;
  userId?: string;
  username?: string;
}

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [usersSearch, setUsersSearch] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'channels' | 'reports'>('overview');
  const [newChannelName, setNewChannelName] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/chat');
      return;
    }
    fetchDashboardData();
    fetchUsers();
    fetchChannels();
  }, [user, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, reportsData, activityData] = await Promise.all([
        adminService.getStats(),
        adminService.getReports(),
        axiosInstance.get('/admin/recent-activity')
      ]);
      
      setStats(statsData);
      setReports(reportsData);
      setRecentActivity(activityData.data);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page = 1, search = '') => {
    try {
      const response = await axiosInstance.get(`/admin/users?page=${page}&limit=10&search=${search}`);
      setUsers(response.data.users || []);
      setUsersPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await axiosInstance.get('/channels');
      setChannels(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      setChannels([]);
    }
  };

  const toggleUserBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/block`, { isBlocked: !isBlocked });
      fetchUsers(usersPagination.page, usersSearch);
    } catch (error) {
      console.error('Error toggling user block:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      fetchUsers(usersPagination.page, usersSearch);
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
    return <div className="flex justify-center items-center h-screen">Accès refusé</div>;
  }

  if (loading && activeTab === 'overview') {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Administrateur
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Vue d'ensemble de la plateforme TChat
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'overview'
                ? 'bg-orange-400 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'users'
                ? 'bg-orange-400 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Utilisateurs ({usersPagination.total})
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
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'reports'
                ? 'bg-orange-400 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Signalements ({reports.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Statistiques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Utilisateurs Total
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalUsers ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-green-600 dark:text-green-400">
                    +{stats?.newUsersLast7d ?? 0} cette semaine
                  </span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Utilisateurs Actifs
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats?.activeUsers ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Connectés Maintenant
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats?.onlineUsers ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Messages Total
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalMessages ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    +{stats?.messagesLast24h ?? 0} dernières 24h
                  </span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Signalements
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalReports ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Activités récentes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Activités récentes
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity._id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'user_join' ? 'bg-green-400' :
                        activity.type === 'message_sent' ? 'bg-blue-400' :
                        activity.type === 'user_reported' ? 'bg-red-400' :
                        'bg-orange-400'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gestion des utilisateurs
              </h3>
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={usersSearch}
                onChange={(e) => {
                  setUsersSearch(e.target.value);
                  fetchUsers(1, e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sexe
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Âge
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ville
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Activé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bloqué
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Créé le
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Dernière connexion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {user._id.slice(-6)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.email || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.sexe || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.age || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.ville || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isAnonymous 
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {user.isAnonymous ? 'Anonyme' : 'Inscrit'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isOnline 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {user.isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isEnabled 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {user.isEnabled ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isBlocked 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {user.isBlocked ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.lastSeen ? new Date(user.lastSeen).toLocaleString('fr-FR') : 'Jamais'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => toggleUserBlock(user._id, user.isBlocked)}
                            className={`px-2 py-1 rounded text-xs ${
                              user.isBlocked
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                            }`}
                          >
                            {user.isBlocked ? 'Débloquer' : 'Bloquer'}
                          </button>
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
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
            
            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Affichage de {((usersPagination.page - 1) * usersPagination.limit) + 1} à {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} sur {usersPagination.total} utilisateurs
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => fetchUsers(usersPagination.page - 1, usersSearch)}
                  disabled={usersPagination.page <= 1}
                  className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Précédent
                </button>
                <span className="px-3 py-1 bg-orange-400 text-white rounded">
                  {usersPagination.page} / {usersPagination.pages}
                </span>
                <button
                  onClick={() => fetchUsers(usersPagination.page + 1, usersSearch)}
                  disabled={usersPagination.page >= usersPagination.pages}
                  className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gestion des canaux
              </h3>
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
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Créé le
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {channels.map((channel) => (
                    <tr key={channel._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        #{channel.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(channel.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Gestion des signalements
            </h3>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {report.reportedBy.username} a signalé {report.reportedUser.username}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Raison: {report.reason}
                      </p>
                      {report.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Description: {report.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;