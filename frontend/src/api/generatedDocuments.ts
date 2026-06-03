import { apiClient } from './client';
import {
  GeneratedDocument,
  GeneratedDocumentAdminFilters,
  GeneratedDocStatus,
  PageResponse,
} from '../types';

export const generatedDocumentsApi = {
  getMy: async (): Promise<GeneratedDocument[]> => {
    const response = await apiClient.get('/api/generated-documents/me');
    return response.data;
  },

  getAdminAll: async (filters?: GeneratedDocumentAdminFilters): Promise<PageResponse<GeneratedDocument>> => {
    const params: Record<string, string> = {};
    if (filters?.teacherId) params.teacherId = String(filters.teacherId);
    if (filters?.documentType) params.documentType = filters.documentType;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.sourceExcel) params.sourceExcel = filters.sourceExcel;
    if (filters?.status) params.status = filters.status;
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);
    const response = await apiClient.get('/api/generated-documents/admin', { params });
    return response.data;
  },

  getById: async (id: number): Promise<GeneratedDocument> => {
    const response = await apiClient.get(`/api/generated-documents/${id}`);
    return response.data;
  },

  download: async (id: number, originalFileName?: string): Promise<void> => {
    const response = await apiClient.get(`/api/generated-documents/${id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalFileName || `document-${id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  updateStatus: async (id: number, status: GeneratedDocStatus, comment?: string): Promise<GeneratedDocument> => {
    const response = await apiClient.put(`/api/generated-documents/${id}/status`, {
      status,
      comment: comment ?? null,
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/generated-documents/${id}`);
  },
};
