import axiosInstance from '@/utils/axiosInstance';

export const reportService = {
  // Signaler un utilisateur ou un message
  async reportUser(reportedUserId: string, reason: string, description?: string) {
    try {
      if (!reportedUserId || !reason) {
        throw new Error('User ID and reason are required');
      }
      const response = await axiosInstance.post('/reports/report', {
        reportedUserId,
        reason,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Error reporting user:', error);
      throw new Error(`Failed to report user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Bloquer un utilisateur
  async blockUser(userId: string) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      const response = await axiosInstance.post(`/reports/block/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error blocking user:', error);
      throw new Error(`Failed to block user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Débloquer un utilisateur
  async unblockUser(userId: string) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      const response = await axiosInstance.delete(`/reports/block/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw new Error(`Failed to unblock user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Récupérer les utilisateurs bloqués
  async getBlockedUsers() {
    try {
      const response = await axiosInstance.get('/reports/blocked');
      return response.data;
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      throw new Error(`Failed to fetch blocked users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};