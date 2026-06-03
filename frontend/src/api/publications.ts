import { apiClient } from './client';
import {
  Publication,
  PublicationFile,
  PublicationDto,
  PublicationAdminFilters,
  PublicationStatus,
  PageResponse,
} from '../types';

export const publicationsApi = {
  getMyPublications: async (): Promise<Publication[]> => {
    const { data } = await apiClient.get('/api/publications/me');
    return data;
  },

  getByUser: async (userId: number): Promise<Publication[]> => {
    const { data } = await apiClient.get(`/api/publications/user/${userId}`);
    return data;
  },

  getAllForAdmin: async (filters?: PublicationAdminFilters): Promise<PageResponse<Publication>> => {
    const { data } = await apiClient.get('/api/publications/admin', { params: filters });
    return data;
  },

  getById: async (id: number): Promise<Publication> => {
    const { data } = await apiClient.get(`/api/publications/${id}`);
    return data;
  },

  create: async (dto: PublicationDto): Promise<Publication> => {
    const { data } = await apiClient.post('/api/publications', dto);
    return data;
  },

  update: async (id: number, dto: PublicationDto): Promise<Publication> => {
    const { data } = await apiClient.put(`/api/publications/${id}`, dto);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/publications/${id}`);
  },

  submit: async (id: number): Promise<Publication> => {
    const { data } = await apiClient.post(`/api/publications/${id}/submit`);
    return data;
  },

  verify: async (id: number, comment?: string): Promise<Publication> => {
    const { data } = await apiClient.put(`/api/publications/${id}/verify`, { comment });
    return data;
  },

  reject: async (id: number, comment: string): Promise<Publication> => {
    const { data } = await apiClient.put(`/api/publications/${id}/reject`, { comment });
    return data;
  },

  needsCorrection: async (id: number, comment: string): Promise<Publication> => {
    const { data } = await apiClient.put(`/api/publications/${id}/needs-correction`, { comment });
    return data;
  },

  addFile: async (id: number, file: File, fileType: string): Promise<PublicationFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    const { data } = await apiClient.post(`/api/publications/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getFiles: async (id: number): Promise<PublicationFile[]> => {
    const { data } = await apiClient.get(`/api/publications/${id}/files`);
    return data;
  },

  downloadFile: async (fileId: number, originalName: string): Promise<void> => {
    const response = await apiClient.get(`/api/publications/files/${fileId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  deleteFile: async (fileId: number): Promise<void> => {
    await apiClient.delete(`/api/publications/files/${fileId}`);
  },

  updateStatus: async (id: number, status: PublicationStatus): Promise<Publication> => {
    const { data } = await apiClient.put(`/api/publications/${id}`, { status });
    return data;
  },
};
