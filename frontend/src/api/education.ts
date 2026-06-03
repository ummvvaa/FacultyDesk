import { apiClient } from './client';
import { Education } from '../types';

export const educationApi = {
  getMy: async (): Promise<Education[]> => {
    const { data } = await apiClient.get('/api/education/me');
    return data;
  },

  getByUser: async (userId: number): Promise<Education[]> => {
    const { data } = await apiClient.get(`/api/education/user/${userId}`);
    return data;
  },

  create: async (payload: Partial<Education>): Promise<Education> => {
    const { data } = await apiClient.post('/api/education', payload);
    return data;
  },

  update: async (id: number, payload: Partial<Education>): Promise<Education> => {
    const { data } = await apiClient.put(`/api/education/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/education/${id}`);
  },
};
