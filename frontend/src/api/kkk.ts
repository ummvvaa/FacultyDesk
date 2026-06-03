import { apiClient } from './client';
import { KkkProfile, KkkStatus, KkkAdminFilters, PageResponse } from '../types';

export const kkkApi = {
  getMy: async (locale: string = 'ru'): Promise<KkkProfile> => {
    const { data } = await apiClient.get('/api/kkk/me', { params: { locale } });
    return data;
  },

  submit: async (): Promise<KkkProfile> => {
    const { data } = await apiClient.post('/api/kkk/submit');
    return data;
  },

  getAdminAll: async (filters?: KkkAdminFilters): Promise<PageResponse<KkkProfile>> => {
    const { data } = await apiClient.get('/api/kkk/admin', { params: filters });
    return data;
  },

  getAdminDetail: async (teacherId: number): Promise<KkkProfile> => {
    const { data } = await apiClient.get(`/api/kkk/admin/${teacherId}`);
    return data;
  },

  updateStatus: async (id: number, status: KkkStatus, comment?: string): Promise<KkkProfile> => {
    const { data } = await apiClient.put(`/api/kkk/${id}/status`, { status, comment });
    return data;
  },

  getUserCompletion: async (teacherId: number): Promise<{ completionPercentage: number; status: string | null }> => {
    const { data } = await apiClient.get(`/api/kkk/user/${teacherId}/completion`);
    return data;
  },

  exportPdf: async (teacherId: number, filename: string): Promise<void> => {
    const response = await apiClient.get(`/api/kkk/${teacherId}/export`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
