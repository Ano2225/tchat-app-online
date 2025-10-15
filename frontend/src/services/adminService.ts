import axiosInstance from '@/utils/axiosInstance';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalMessages: number;
  newUsersLast7d: number;
  messagesLast24h: number;
  totalReports: number;
}

export interface ConnectionAnalytics {
  dailyStats: Array<{ _id: { day: number; date: string }; count: number }>;
  hourlyStats: Array<{ _id: number; count: number }>;
  peakHour: { hour: number; count: number };
  peakDay: { day: string; count: number };
}

export interface Report {
  _id: string;
  reportedBy: {
    _id: string;
    username: string;
  };
  reportedUser: {
    _id: string;
    username: string;
  };
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export const adminService = {
  // Récupérer les statistiques
  async getStats(): Promise<DashboardStats> {
    const response = await axiosInstance.get('/admin/stats');
    return response.data;
  },

  // Récupérer tous les messages
  async getAllMessages() {
    const response = await axiosInstance.get('/admin/messages');
    return response.data;
  },

  // Récupérer tous les signalements
  async getReports(): Promise<Report[]> {
    const response = await axiosInstance.get('/admin/reports');
    return response.data;
  },

  // Récupérer les analytics de connexion
  async getConnectionAnalytics(): Promise<ConnectionAnalytics> {
    const response = await axiosInstance.get('/admin/analytics');
    return response.data;
  },

  // Traiter un signalement
  async handleReport(reportId: string, status: string, action?: string) {
    const response = await axiosInstance.put(`/admin/reports/${reportId}`, {
      status,
      action
    });
    return response.data;
  }
};