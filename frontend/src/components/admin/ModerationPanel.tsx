'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ReportedMessage {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
  };
  channel: {
    _id: string;
    name: string;
  };
  reportedBy: {
    _id: string;
    username: string;
  }[];
  reportCount: number;
  reportReasons: string[];
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ModerationStats {
  pendingReports: number;
  resolvedToday: number;
  totalReports: number;
  autoModerated: number;
}

const ModerationPanel: React.FC = () => {
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  useEffect(() => {
    fetchModerationData();
  }, [filter]);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      const [reportsRes, statsRes] = await Promise.all([
        axiosInstance.get('/admin/reported-messages', { params: { status: filter } }),
        axiosInstance.get('/admin/moderation-stats')
      ]);
      
      setReportedMessages(reportsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données de modération:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageAction = async (messageId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      await axiosInstance.post(`/admin/moderate-message/${messageId}`, { action });
      fetchModerationData();
    } catch (error) {
      console.error('Erreur lors de l\'action de modération:', error);
    }
  };

  const handleBulkAction = async (messageIds: string[], action: 'approve' | 'reject' | 'delete') => {
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ces ${messageIds.length} message(s) ?`)) {
      return;
    }

    try {
      await Promise.all(
        messageIds.map(id => 
          axiosInstance.post(`/admin/moderate-message/${id}`, { action })
        )
      );
      fetchModerationData();
    } catch (error) {
      console.error('Erreur lors de l\'action groupée:', error);
    }
  };

  const getSeverityColor = (reportCount: number) => {
    if (reportCount >= 5) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (reportCount >= 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques de modération */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats?.pendingReports || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats?.resolvedToday || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Résolus aujourd'hui</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats?.totalReports || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total signalements</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats?.autoModerated || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Auto-modérés</p>
          </div>
        </Card>
      </div>

      {/* Panel de modération */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Messages Signalés
          </h2>
          
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'resolved')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="pending">En attente</option>
              <option value="resolved">Résolus</option>
              <option value="all">Tous</option>
            </select>
          </div>
        </div>

        {reportedMessages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Aucun message signalé {filter === 'pending' ? 'en attente' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportedMessages.map((message) => (
              <div key={message._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        @{message.sender.username}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        dans #{message.channel.name}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(message.reportCount)}`}>
                        {message.reportCount} signalement(s)
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-3">
                      <p className="text-gray-900 dark:text-white">{message.content}</p>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Raisons: {message.reportReasons.join(', ')}</p>
                      <p>Signalé par: {message.reportedBy.map(u => u.username).join(', ')}</p>
                      <p>Date: {new Date(message.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                </div>
                
                {message.status === 'pending' && (
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMessageAction(message._id, 'approve')}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMessageAction(message._id, 'reject')}
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                    >
                      Rejeter le signalement
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMessageAction(message._id, 'delete')}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Supprimer le message
                    </Button>
                  </div>
                )}
                
                {message.status !== 'pending' && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      message.status === 'approved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {message.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ModerationPanel;