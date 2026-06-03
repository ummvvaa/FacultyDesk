import { apiClient } from './client';
import { Message, User } from '../types';

export const messagesApi = {
  send: async (receiverId: number, content: string): Promise<Message> => {
    const response = await apiClient.post('/api/messages', null, {
      params: { receiverId, content },
    });
    return response.data;
  },

  getConversation: async (userId: number): Promise<Message[]> => {
    const response = await apiClient.get(`/api/messages/conversation/${userId}`);
    return response.data;
  },

  getChatList: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/messages/chats');
    return response.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await apiClient.put(`/api/messages/${id}/read`);
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/api/messages/unread/count');
    return response.data.count;
  },
};

