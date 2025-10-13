'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import { Card } from '@/components/ui/Card';
import LoadingSpinner  from '@/components/ui/LoadingSpinner';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalChannels: number;
  blockedUsers: number;
  messagesLast24h: number;
  newUsersLast7d: number;
  reportedMessages: number;
}

interface RecentActivity {
  _id: string;
  type: 'user_join' | 'message_sent' | 'user_blocked' | 'channel_created';
  description: string;
  timestamp: string;
  userId?: string;
  username?: string;
}

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/chat');
      return;
    }
    fetchDashboardData();
  }, [user, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        axiosInstance.get('/admin/stats'),
        axiosInstance.get('/admin/recent-activity')
      ]);
      
      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return <div className="flex justify-center items-center h-screen">Accès refusé</div>;
  }

  if (loading) {
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

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Utilisateurs Total
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalUsers || 0}
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
                +{stats?.newUsersLast7d || 0} cette semaine
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
                  {stats?.activeUsers || 0}
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
                  Messages Total
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalMessages || 0}
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
                {stats?.messagesLast24h || 0} dernières 24h
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
                  {stats?.reportedMessages || 0}
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

        {/* Navigation rapide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/users')}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Gestion Utilisateurs
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Gérer les comptes, blocages et permissions
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/moderation')}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Modération
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Signalements et contrôle du contenu
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/analytics')}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Analytiques
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Statistiques détaillées et rapports
            </p>
          </Card>
        </div>

        {/* Activité récente */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activité Récente
          </h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity._id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
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
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Aucune activité récente
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;