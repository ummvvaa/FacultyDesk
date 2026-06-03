import { apiClient } from './client';
import { Award } from '../types';

export const awardsApi = {
  getMy: async (): Promise<Award[]> => {
    const { data } = await apiClient.get('/api/awards/me');
    return data;
  },

  getByUser: async (userId: number): Promise<Award[]> => {
    const { data } = await apiClient.get(`/api/awards/user/${userId}`);
    return data;
  },

  create: async (payload: Partial<Award>): Promise<Award> => {
    const { data } = await apiClient.post('/api/awards', payload);
    return data;
  },

  update: async (id: number, payload: Partial<Award>): Promise<Award> => {
    const { data } = await apiClient.put(`/api/awards/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/awards/${id}`);
  },
};
