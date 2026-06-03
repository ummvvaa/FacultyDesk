import { apiClient } from './client';
import { Activity } from '../types';

export const activityApi = {
  getUserActivity: async (userId: number): Promise<Activity[]> => {
    const response = await apiClient.get(`/api/activity/${userId}`);
    return response.data;
  },
};

