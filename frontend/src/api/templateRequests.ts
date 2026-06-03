import { apiClient } from './client';
import { TemplateRequest, RequestStatus, TemplateCategory } from '../types';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const templateRequestsApi = {
  create: async (data: { title: string; description?: string; suggestedCategory?: TemplateCategory }): Promise<TemplateRequest> => {
    const response = await apiClient.post('/api/template-requests', data);
    return response.data;
  },

  getMyRequests: async (): Promise<TemplateRequest[]> => {
    const response = await apiClient.get('/api/template-requests/me');
    return response.data;
  },

  cancel: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/template-requests/${id}`);
  },

  getAdminAll: async (params?: { page?: number; size?: number; status?: RequestStatus | '' }): Promise<PageResponse<TemplateRequest>> => {
    const query: Record<string, string | number> = {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
    };
    if (params?.status) query.status = params.status;
    const response = await apiClient.get('/api/template-requests/admin', { params: query });
    return response.data;
  },

  getPendingCount: async (): Promise<number> => {
    const response = await apiClient.get('/api/template-requests/admin/pending-count');
    return response.data.count;
  },

  adminUpdate: async (id: number, data: { status?: RequestStatus; adminResponse?: string; linkToTemplateId?: number }): Promise<TemplateRequest> => {
    const response = await apiClient.put(`/api/template-requests/admin/${id}`, data);
    return response.data;
  },
};
