import { apiClient } from './client';
import { Patent } from '../types';

export const patentsApi = {
  getMy: async (): Promise<Patent[]> => {
    const { data } = await apiClient.get('/api/patents/me');
    return data;
  },

  getByUser: async (userId: number): Promise<Patent[]> => {
    const { data } = await apiClient.get(`/api/patents/user/${userId}`);
    return data;
  },

  create: async (payload: Partial<Patent>): Promise<Patent> => {
    const { data } = await apiClient.post('/api/patents', payload);
    return data;
  },

  update: async (id: number, payload: Partial<Patent>): Promise<Patent> => {
    const { data } = await apiClient.put(`/api/patents/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/patents/${id}`);
  },
};
