import axiosInstance from '@/utils/axiosInstance';

export interface Conversation {
  id: string;
  user: string;
  lastMessage: string;
  hasNewMessages: boolean;
  unreadCount: number;
}

export interface MessageNotification {
  from: {
    _id: string;
    username: string;
  };
  content: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
  };
  media_url?: string;
  media_type?: string;
  createdAt: string;
  read: boolean;
}

export interface Recipient {
  _id: string;
  username: string;
}

class ChatService {
  private mapConversationData(data: any[]): Conversation[] {
    return data.map((conv) => ({
      id: conv.user?._id || '',
      user: conv.user?.username || 'Unknown User',
      lastMessage: conv.lastMessage?.content || 'No messages',
      hasNewMessages: conv.hasNewMessages ?? false,
      unreadCount: conv.unreadCount ?? 0,
    }));
  }

  /**
   * Fetches user conversations with unread count.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<Conversation[]>} - A promise that resolves to an array of conversations.
   * @throws {Error} - Throws an error if the API call fails.
   */
  async fetchConversations(userId: string): Promise<Conversation[]> {
    try {
      const response = await axiosInstance.get<{
        user: { _id: string; username: string };
        lastMessage: { content: string };
        hasNewMessages?: boolean;
        unreadCount?: number;
      }[]>(`/messages/conversations/${userId}`);

      if (Array.isArray(response.data)) {
        return this.mapConversationData(response.data);
      }

      console.error('Conversations response is not an array:', response.data);
      return []; 
    } catch (error) {
      console.error('Error fetching conversations:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to fetch conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Marks all messages in a conversation as read.
   * @param {string} userId - The ID of the current user.
   * @param {string} conversationId - The ID of the other user in the conversation.
   * @returns {Promise<boolean>} - A promise that resolves to true if successful, false otherwise.
   */
  async markConversationAsRead(userId: string, conversationId: string): Promise<void> {
    try {
      await axiosInstance.post(`/messages/mark-as-read`, {
        userId,
        conversationId,
      });
    } catch (error) {
      console.error('Error marking conversation as read');
      throw error;
    }
  }

  /**
   * Get private messages between two users.
   * @param {string} userId - The ID of the current user.
   * @param {string} recipientId - The ID of the recipient user.
   * @returns {Promise<Message[]>} - A promise that resolves to an array of messages.
   * @throws {Error} - Throws an error if the API call fails.
   */
  async getPrivateMessages(userId: string, recipientId: string): Promise<Message[]> {
    try {
      if (!userId || !recipientId) {
        throw new Error('User ID and recipient ID are required');
      }
      
      const response = await axiosInstance.get<Message[]>(`/messages/private/${userId}/${recipientId}`);
      
      if (!Array.isArray(response.data)) {
        console.error('Private messages response is not an array:', response.data);
        return [];
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching private messages:', error);
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sends a private message.
   * @param {string} content - The content of the message.
   * @param {string} senderId - The ID of the sender.
   * @param {string} recipientId - The ID of the recipient.
   * @returns {Promise<Message>} - A promise that resolves to the created message.
   * @throws {Error} - Throws an error if the API call fails.
   */
  
  async sendPrivateMessage(content: string, senderId: string, recipientId: string, mediaUrl?: string, mediaType?: string): Promise<Message> {
    try {
      if (!content?.trim() || !senderId || !recipientId) {
        throw new Error('Content, sender ID, and recipient ID are required');
      }
      
      const socket = (window as any)?.socket;
      
      if (!socket) {
        throw new Error('Socket connection not available');
      }
      
      if (!socket.connected) {
        throw new Error('Socket not connected');
      }
      
      socket.emit('send_private_message', {
        senderId,
        recipientId,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
      });
      
      return {
        _id: Date.now().toString(),
        content,
        sender: { _id: senderId, username: 'Vous' },
        media_url: mediaUrl,
        media_type: mediaType,
        createdAt: new Date().toISOString(),
        read: false,
      };
    } catch (error) {
      console.error('Error sending private message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
}

export const chatService = new ChatService();
export default chatService;