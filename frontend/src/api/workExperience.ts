import { apiClient } from './client';
import { WorkExperience } from '../types';

export const workExperienceApi = {
  getMy: async (): Promise<WorkExperience[]> => {
    const { data } = await apiClient.get('/api/work-experience/me');
    return data;
  },

  getByUser: async (userId: number): Promise<WorkExperience[]> => {
    const { data } = await apiClient.get(`/api/work-experience/user/${userId}`);
    return data;
  },

  create: async (payload: Partial<WorkExperience>): Promise<WorkExperience> => {
    const { data } = await apiClient.post('/api/work-experience', payload);
    return data;
  },

  update: async (id: number, payload: Partial<WorkExperience>): Promise<WorkExperience> => {
    const { data } = await apiClient.put(`/api/work-experience/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/work-experience/${id}`);
  },
};
