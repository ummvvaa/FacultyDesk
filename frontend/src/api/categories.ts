import { apiClient } from './client';
import { Category } from '../types';

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    try {
      console.log('Fetching categories from /api/categories...');
      const response = await apiClient.get('/api/categories');
      console.log('Categories API response:', response);
      console.log('Categories data:', response.data);
      console.log('Categories count:', Array.isArray(response.data) ? response.data.length : 'Not an array');
      
      if (!Array.isArray(response.data)) {
        console.error('Categories response is not an array:', response.data);
        return [];
      }
      
      return response.data || [];
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      throw error;
    }
  },

  getById: async (id: number): Promise<Category> => {
    const response = await apiClient.get(`/api/categories/${id}`);
    return response.data;
  },

  create: async (name: string): Promise<Category> => {
    const response = await apiClient.post('/api/categories', null, {
      params: { name },
    });
    return response.data;
  },

  update: async (id: number, name: string): Promise<Category> => {
    const response = await apiClient.put(`/api/categories/${id}`, null, {
      params: { name },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/categories/${id}`);
  },
};

