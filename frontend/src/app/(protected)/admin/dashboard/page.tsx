'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import { Card } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminService, type DashboardStats, type Report, type ConnectionAnalytics } from '@/services/adminService';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

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

const StatCard = ({
  title, value, sub, color, icon,
}: {
  title: string; value: number; sub?: string; color: string; icon: React.ReactNode;
}) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString('fr-FR')}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    </div>
  </Card>
);

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<ConnectionAnalytics | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [usersSearch, setUsersSearch] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'users' | 'channels' | 'reports'>('overview');
  const [newChannelName, setNewChannelName] = useState('');
  const [usersTypeFilter, setUsersTypeFilter] = useState<'all' | 'registered' | 'anonymous'>('all');
  const [renamingChannelId, setRenamingChannelId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, reportsData, activityRes, analyticsData] = await Promise.all([
        adminService.getStats(),
        adminService.getReports(),
        axiosInstance.get<RecentActivity[]>('/admin/recent-activity'),
        adminService.getConnectionAnalytics(),
      ]);
      setStats(statsData);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setRecentActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1, search = '', type: 'all' | 'registered' | 'anonymous' = 'all') => {
    try {
      const response = await axiosInstance.get(`/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}&type=${type}`);
      setUsers(response.data.users ?? []);
      setUsersPagination(response.data.pagination ?? { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/channels');
      setChannels(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      setChannels([]);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/chat');
      return;
    }
    fetchDashboardData();
    fetchUsers();
    fetchChannels();
  }, [user, router, fetchDashboardData, fetchUsers, fetchChannels]);

  const toggleUserBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/block`, { isBlocked: !isBlocked });
      fetchUsers(usersPagination.page, usersSearch, usersTypeFilter);
    } catch (error) {
      console.error('Error toggling user block:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      fetchUsers(usersPagination.page, usersSearch, usersTypeFilter);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const renameChannel = async (channelId: string) => {
    if (!renameValue.trim()) return;
    try {
      await axiosInstance.put(`/admin/channels/${channelId}`, { name: renameValue.trim() });
      setRenamingChannelId(null);
      setRenameValue('');
      fetchChannels();
    } catch (error) {
      console.error('Error renaming channel:', error);
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

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'users', label: `Utilisateurs (${usersPagination.total})` },
    { key: 'channels', label: `Canaux (${channels.length})` },
    { key: 'reports', label: `Signalements (${reports.length})` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Admin</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">BabiChat — métriques en temps réel</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/chat')}
            className="flex items-center space-x-2 px-4 py-2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Retour au Chat</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                activeTab === t.key
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard
                title="Total utilisateurs" value={stats?.totalUsers ?? 0}
                sub={`+${stats?.newUsersLast7d ?? 0} cette semaine`}
                color="bg-blue-100 dark:bg-blue-900"
                icon={<svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>}
              />
              <StatCard
                title="Inscrits" value={stats?.registeredUsers ?? 0}
                sub={`+${stats?.newRegisteredUsersLast7d ?? 0} cette semaine`}
                color="bg-indigo-100 dark:bg-indigo-900"
                icon={<svg className="w-5 h-5 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              />
              <StatCard
                title="Actifs 24h" value={stats?.activeUsers ?? 0}
                sub="Connectés < 24h"
                color="bg-green-100 dark:bg-green-900"
                icon={<svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <StatCard
                title="En ligne" value={stats?.onlineUsers ?? 0}
                color="bg-emerald-100 dark:bg-emerald-900"
                icon={<svg className="w-5 h-5 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
              />
              <StatCard
                title="Messages" value={stats?.totalMessages ?? 0}
                sub={`+${stats?.messagesLast24h ?? 0} en 24h`}
                color="bg-purple-100 dark:bg-purple-900"
                icon={<svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              />
              <StatCard
                title="Signalements" value={stats?.totalReports ?? 0}
                color="bg-red-100 dark:bg-red-900"
                icon={<svg className="w-5 h-5 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
              />
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activités récentes</h3>
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune activité récente.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity._id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        activity.type === 'user_join' ? 'bg-green-400' :
                        activity.type === 'message_sent' ? 'bg-blue-400' :
                        activity.type === 'user_reported' ? 'bg-red-400' :
                        'bg-orange-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(activity.timestamp).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-5 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Heure de pic</p>
                <p className="text-3xl font-bold text-primary-500">{analytics?.peakHour.hour ?? '—'}h</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{analytics?.peakHour.count ?? 0} connexions</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Jour de pic</p>
                <p className="text-3xl font-bold text-secondary-500">{analytics?.peakDay.day ?? '—'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{analytics?.peakDay.count ?? 0} utilisateurs</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Nouveaux inscrits (7j)</p>
                <p className="text-3xl font-bold text-green-500">
                  {analytics?.timeline.reduce((s, d) => s + d.newUsers, 0) ?? 0}
                </p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Messages (7j)</p>
                <p className="text-3xl font-bold text-purple-500">
                  {analytics?.timeline.reduce((s, d) => s + d.messages, 0) ?? 0}
                </p>
              </Card>
            </div>

            {/* Messages + Users chart */}
            <Card className="p-6 mb-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Messages &amp; Utilisateurs actifs — 7 derniers jours</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics?.timeline ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="messages" name="Messages" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="activeUsers" name="Actifs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* New users trend */}
            <Card className="p-6 mb-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Nouveaux inscrits — 7 derniers jours</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics?.timeline ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="newUsers" name="Nouveaux inscrits" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Hourly activity */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Activité par heure — 24h</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(analytics?.hourlyStats ?? []).map(h => ({ heure: `${h._id}h`, connexions: h.count }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="heure" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="connexions" name="Connexions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <Card className="p-6">
            <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Utilisateurs</h3>
                {/* Type filter pills */}
                <div className="flex gap-1 ml-2">
                  {([['all', 'Tous'], ['registered', 'Inscrits'], ['anonymous', 'Anonymes']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => {
                        setUsersTypeFilter(val);
                        fetchUsers(1, usersSearch, val);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        usersTypeFilter === val
                          ? 'bg-primary-500 text-white shadow'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Rechercher..."
                value={usersSearch}
                onChange={(e) => { setUsersSearch(e.target.value); fetchUsers(1, e.target.value, usersTypeFilter); }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['ID', 'Utilisateur', 'Email', 'Rôle', 'Sexe', 'Âge', 'Ville', 'Type', 'Statut', 'Activé', 'Bloqué', 'Créé le', 'Dernière connexion', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((u, idx) => (
                    <tr key={String(u._id ?? u.email ?? idx)}>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {String(u._id ?? '').slice(-6) || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{u.username}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{u.email || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{u.sexe || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{u.age || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{u.ville || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${u.isAnonymous ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                          {u.isAnonymous ? 'Anonyme' : 'Inscrit'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${u.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                          {u.isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${u.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.isEnabled ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${u.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {u.isBlocked ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{u.lastSeen ? new Date(u.lastSeen).toLocaleDateString('fr-FR') : 'Jamais'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          <button onClick={() => toggleUserBlock(u._id, u.isBlocked)} className={`px-2 py-1 rounded text-xs ${u.isBlocked ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>
                            {u.isBlocked ? 'Débloquer' : 'Bloquer'}
                          </button>
                          <button onClick={() => deleteUser(u._id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {usersPagination.total > 0
                  ? `${((usersPagination.page - 1) * usersPagination.limit) + 1}–${Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} / ${usersPagination.total}`
                  : '0 utilisateurs'}
              </p>
              <div className="flex space-x-2">
                <button onClick={() => fetchUsers(usersPagination.page - 1, usersSearch, usersTypeFilter)} disabled={usersPagination.page <= 1} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded disabled:opacity-50 text-sm">Précédent</button>
                <span className="px-3 py-1 bg-primary-500 text-white rounded text-sm">{usersPagination.page} / {usersPagination.pages || 1}</span>
                <button onClick={() => fetchUsers(usersPagination.page + 1, usersSearch, usersTypeFilter)} disabled={usersPagination.page >= usersPagination.pages} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded disabled:opacity-50 text-sm">Suivant</button>
              </div>
            </div>
          </Card>
        )}

        {/* ── CHANNELS TAB ── */}
        {activeTab === 'channels' && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gestion des canaux</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Nom du nouveau canal"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button onClick={createChannel} className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 text-sm">Créer</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['Nom', 'Créé le', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {channels.map((ch) => (
                    <tr key={ch._id}>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {renamingChannelId === ch._id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">#</span>
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameChannel(ch._id);
                                if (e.key === 'Escape') { setRenamingChannelId(null); setRenameValue(''); }
                              }}
                              className="px-2 py-1 border border-blue-400 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 w-40"
                            />
                          </div>
                        ) : (
                          <span>#{ch.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(ch.createdAt).toLocaleString('fr-FR')}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {renamingChannelId === ch._id ? (
                            <>
                              <button
                                onClick={() => renameChannel(ch._id)}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                              >
                                Valider
                              </button>
                              <button
                                onClick={() => { setRenamingChannelId(null); setRenameValue(''); }}
                                className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                              >
                                Annuler
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setRenamingChannelId(ch._id); setRenameValue(ch.name); }}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            >
                              Renommer
                            </button>
                          )}
                          <button onClick={() => deleteChannel(ch._id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gestion des signalements</h3>
            {reports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun signalement.</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {report.reportedBy?.username ?? '?'} a signalé {report.reportedUser?.username ?? '?'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Raison : {report.reason}</p>
                        {report.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Description : {report.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{new Date(report.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
