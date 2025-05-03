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
  createdAt: string;
  read: boolean;
}

export interface Recipient {
  _id: string;
  username: string;
}

class ChatService {
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

      // Ensure the response data is an array and map it to the Conversation interface
      if (Array.isArray(response.data)) {
        return response.data.map((conv) => ({
          id: conv.user._id,
          user: conv.user.username,
          lastMessage: conv.lastMessage.content,
          hasNewMessages: conv.hasNewMessages ?? false,
          unreadCount: conv.unreadCount ?? 0,
        }));
      }

      console.error('Conversations response is not an array:', response.data);
      return []; 
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error; 
    }
  }

  /**
   * Marks all messages in a conversation as read.
   * @param {string} userId - The ID of the current user.
   * @param {string} conversationId - The ID of the other user in the conversation.
   * @returns {Promise<boolean>} - A promise that resolves to true if successful, false otherwise.
   */
  async markConversationAsRead(userId: string, conversationId: string): Promise<boolean> {
    try {
      await axiosInstance.post(`/messages/mark-as-read`, {
        userId: userId,
        conversationId: conversationId,
      });
      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
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
      const response = await axiosInstance.get<Message[]>(`/messages/private/${userId}/${recipientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching private messages:', error);
      throw error; 
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
  async sendPrivateMessage(content: string, senderId: string, recipientId: string): Promise<Message> {
    try {
      const response = await axiosInstance.post<Message>('/messages/private', {
        content,
        sender: senderId,
        recipient: recipientId,
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