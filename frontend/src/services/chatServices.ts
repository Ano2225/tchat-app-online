import axiosInstance from '@/utils/axiosInstance';

export interface Conversation {
  id: string;
  user: string;
  lastMessage: string;
  hasNewMessages?: boolean;
  unreadCount?: number;
}

export interface MessageNotification {
  from: { 
    _id: string; 
    username: string;
  };
  content: string;
  createdAt: string;
}

export interface Recipient {
  _id: string;
  username: string;
}

class ChatService {
  // Fetch user conversations with unread count
  async fetchConversations(userId: string): Promise<Conversation[]> {
    try {
      const response = await axiosInstance.get(`/messages/conversations/${userId}`);
      const data = response.data;

      if (Array.isArray(data)) {
        return data.map((conv) => ({
          id: conv.user._id,
          user: conv.user.username,
          lastMessage: conv.lastMessage.content,
          hasNewMessages: conv.hasNewMessages || false,
          unreadCount: conv.unreadCount || 0
        }));
      }
      
      console.error('Conversations response is not an array:', data);
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // Mark all messages in a conversation as read
  async markConversationAsRead(userId: string, conversationId: string): Promise<boolean> {
    try {
      await axiosInstance.post(`/messages/mark-as-read`, {
        userId: userId,
        conversationId: conversationId
      });
      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
  }


  // Get private messages between users
  async getPrivateMessages(userId: string, recipientId: string) {
    try {
      const response = await axiosInstance.get(`/messages/private/${userId}/${recipientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching private messages:', error);
      return [];
    }
  }

  // Send a private message
  async sendPrivateMessage(content: string, senderId: string, recipientId: string) {
    try {
      const response = await axiosInstance.post('/messages/private', {
        content,
        sender: senderId,
        recipient: recipientId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending private message:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
export default chatService;