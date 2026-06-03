import { apiClient } from './client';
import { User } from '../types';
import axios from 'axios';

export const usersApi = {
  getAll: async (search?: string): Promise<User[]> => {
    console.log('usersApi.getAll called with search:', search);
    const params: any = {};
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await apiClient.get('/api/users', { params });
    console.log('usersApi.getAll response:', response.data?.length, 'users');
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  create: async (data: Partial<User> & { password?: string }): Promise<User> => {
    const response = await apiClient.post('/api/users', data);
    return response.data;
  },

  update: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/api/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },

  updateAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Для multipart/form-data НЕ нужно устанавливать Content-Type вручную,
    // браузер сам добавит правильный Content-Type с boundary
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Используем axios напрямую, чтобы не переопределять Content-Type из apiClient
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    const response = await axios.post(
      `${API_BASE_URL}/api/users/me/avatar`,
      formData,
      {
        headers,
        withCredentials: true,
      }
    );
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put('/api/users/me', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  togglePublicProfile: async (enabled: boolean, customSlug?: string): Promise<User> => {
    const response = await apiClient.put('/api/users/me/public-profile', { enabled, customSlug });
    return response.data;
  },

  getPublicProfileStatus: async (): Promise<{ enabled: boolean; slug: string | null }> => {
    const response = await apiClient.get('/api/users/me/public-profile-status');
    return response.data;
  },

  exportCv: async (locale: string = 'ru'): Promise<Blob> => {
    const response = await apiClient.get('/api/users/me/cv', {
      params: { locale },
      responseType: 'blob',
    });
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post('/api/users/me/change-password', data);
  },
};

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const publicProfileApi = {
  getProfile: async (slug: string): Promise<any> => {
    const response = await apiClient.get(`/api/public/profiles/${slug}`);
    return response.data;
  },
};
