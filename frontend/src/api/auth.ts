import { apiClient } from './client';
import { LoginResponse, User } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await apiClient.post('/api/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  register: async (username: string, password: string, email?: string): Promise<void> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    if (email) formData.append('email', email);
    await apiClient.post('/api/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  forgotPassword: async (email: string, reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/api/auth/forgot-password', { email, reason });
    return response.data;
  },
};

export type PasswordResetStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface PasswordResetRequest {
  id: number;
  user: { id: number; username: string; email?: string };
  reason: string;
  status: PasswordResetStatus;
  createdAt: string;
  processedAt?: string;
  processedBy?: { id: number; username: string };
  adminNote?: string;
}

export interface PasswordResetPage {
  content: PasswordResetRequest[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export const passwordResetsApi = {
  list: async (status: PasswordResetStatus, page = 0, size = 20): Promise<PasswordResetPage> => {
    const response = await apiClient.get('/api/admin/password-resets', {
      params: { status, page, size },
    });
    return response.data;
  },

  pendingCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/api/admin/password-resets/pending-count');
    return response.data;
  },

  approve: async (id: number, password?: string): Promise<{ message: string; newPassword: string }> => {
    const response = await apiClient.post(`/api/admin/password-resets/${id}/approve`, { password });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<void> => {
    await apiClient.post(`/api/admin/password-resets/${id}/reject`, { reason });
  },

  adminResetUser: async (userId: number, password?: string): Promise<{ newPassword: string }> => {
    const response = await apiClient.post(`/api/admin/password-resets/user/${userId}/reset`, { password });
    return response.data;
  },
};

