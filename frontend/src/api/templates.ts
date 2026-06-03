import { apiClient } from './client';
import { Template, TemplateFilters } from '../types';

export const templatesApi = {
  getAll: async (filters?: TemplateFilters): Promise<Template[]> => {
    const params: Record<string, string> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.year) params.year = filters.year;
    if (filters?.category) params.category = filters.category;
    if (filters?.type) params.type = filters.type;
    if (filters?.status) params.status = filters.status;
    if (filters?.uploadedBy) params.uploadedBy = String(filters.uploadedBy);
    const response = await apiClient.get('/api/templates', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Template> => {
    const response = await apiClient.get(`/api/templates/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    version?: string;
    academicYear?: string;
    semester?: string;
    templateCategory?: string;
    status?: string;
    file: File;
  }): Promise<Template> => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.version) formData.append('version', data.version);
    if (data.academicYear) formData.append('academicYear', data.academicYear);
    if (data.semester) formData.append('semester', data.semester);
    if (data.templateCategory) formData.append('templateCategory', data.templateCategory);
    if (data.status) formData.append('status', data.status);
    formData.append('file', data.file);
    const response = await apiClient.post('/api/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: number, data: {
    name?: string;
    description?: string;
    version?: string;
    status?: string;
    academicYear?: string;
    semester?: string;
    templateCategory?: string;
    file?: File;
  }): Promise<Template> => {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.version) formData.append('version', data.version);
    if (data.status) formData.append('status', data.status);
    if (data.academicYear) formData.append('academicYear', data.academicYear);
    if (data.semester) formData.append('semester', data.semester);
    if (data.templateCategory) formData.append('templateCategory', data.templateCategory);
    if (data.file) formData.append('file', data.file);
    const response = await apiClient.put(`/api/templates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/templates/${id}`);
  },

  download: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/api/templates/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  preview: async (id: number): Promise<ArrayBuffer> => {
    const response = await apiClient.get(`/api/templates/${id}/preview`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  },

  previewUrl: (id: number): string => {
    return `http://localhost:8080/api/templates/${id}/preview`;
  },
};
