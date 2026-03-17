import axiosInstance from '@/utils/axiosInstance';

export const reportService = {
  // Signaler un utilisateur ou un message
  async reportUser(reportedUserId: string, reason: string, description?: string) {
    if (!reportedUserId || !reason) {
      throw new Error('User ID and reason are required');
    }
    const response = await axiosInstance.post('/reports/report', {
      reportedUserId,
      reason,
      description
    });
    return response.data;
  },

  // Bloquer un utilisateur
  async blockUser(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const response = await axiosInstance.post(`/reports/block/${userId}`);
    return response.data;
  },

  // Débloquer un utilisateur
  async unblockUser(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const response = await axiosInstance.delete(`/reports/block/${userId}`);
    return response.data;
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