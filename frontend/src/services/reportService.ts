import axiosInstance from '@/utils/axiosInstance';

export const reportService = {
  // Signaler un utilisateur ou un message
  async reportUser(reportedUserId: string, reason: string, description?: string) {
    const response = await axiosInstance.post('/reports/report', {
      reportedUserId,
      reason,
      description
    });
    return response.data;
  },

  // Bloquer un utilisateur
  async blockUser(userId: string) {
    const response = await axiosInstance.post(`/reports/block/${userId}`);
    return response.data;
  },

  // Débloquer un utilisateur
  async unblockUser(userId: string) {
    const response = await axiosInstance.delete(`/reports/block/${userId}`);
    return response.data;
  },

  // Récupérer les utilisateurs bloqués
  async getBlockedUsers() {
    const response = await axiosInstance.get('/reports/blocked');
    return response.data;
  }
};