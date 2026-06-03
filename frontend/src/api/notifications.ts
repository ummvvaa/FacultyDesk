import { apiClient } from './client';
import { Notification } from '../types';

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/api/notifications');
    return response.data;
  },

  getUnread: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/api/notifications/unread');
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/api/notifications/unread/count');
    return response.data.count;
  },

  markAsRead: async (id: number): Promise<void> => {
    await apiClient.put(`/api/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/api/notifications/read-all');
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/notifications/${id}`);
  },
};

