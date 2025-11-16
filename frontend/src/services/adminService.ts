import axiosInstance from '@/utils/axiosInstance';

export interface DashboardStats {
  totalUsers: number;
  registeredUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalMessages: number;
  newUsersLast7d: number;
  newRegisteredUsersLast7d: number;
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
    try {
      const response = await axiosInstance.get('/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw new Error(`Failed to fetch stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Récupérer tous les messages
  async getAllMessages() {
    try {
      const response = await axiosInstance.get('/admin/messages');
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Récupérer tous les signalements
  async getReports(): Promise<Report[]> {
    try {
      const response = await axiosInstance.get('/admin/reports');
      return response.data;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw new Error(`Failed to fetch reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Récupérer les analytics de connexion
  async getConnectionAnalytics(): Promise<ConnectionAnalytics> {
    try {
      const response = await axiosInstance.get('/admin/analytics');
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Traiter un signalement
  async handleReport(reportId: string, status: string, action?: string) {
    try {
      if (!reportId || !status) {
        throw new Error('Report ID and status are required');
      }
      const response = await axiosInstance.put(`/admin/reports/${reportId}`, {
        status,
        action
      });
      return response.data;
    } catch (error) {
      console.error('Error handling report:', error);
      throw new Error(`Failed to handle report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};