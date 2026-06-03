import { apiClient } from './client';
import { Record } from '../types';

export const recordsApi = {
  getAll: async (): Promise<Record[]> => {
    const response = await apiClient.get('/api/records');
    return response.data;
  },

  getById: async (id: number): Promise<Record> => {
    const response = await apiClient.get(`/api/records/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description: string;
    categoryId: number;
    file?: File;
    semester?: string;
    type?: string;
  }): Promise<Record> => {
    console.log('📤 recordsApi.create called with:', {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      hasFile: !!data.file,
      fileName: data.file?.name
    });
    
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('categoryId', data.categoryId.toString());
    if (data.file) formData.append('file', data.file);
    if (data.semester) formData.append('semester', data.semester);
    if (data.type) formData.append('type', data.type);

    console.log('📦 FormData prepared, sending request...');
    
    try {
      const response = await apiClient.post('/api/records', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('✅ Response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error in recordsApi.create:', error);
      console.error('❌ Error response:', error.response);
      throw error;
    }
  },

  update: async (id: number, data: { title?: string; description?: string; categoryId?: number; status?: string; comments?: string }): Promise<Record> => {
    const response = await apiClient.put(`/api/records/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/records/${id}`);
  },

  getByCategory: async (categoryId: number): Promise<Record[]> => {
    const response = await apiClient.get(`/api/categories/${categoryId}/records`);
    return response.data;
  },

  getMyRecords: async (): Promise<Record[]> => {
    const response = await apiClient.get('/api/records/me');
    return response.data;
  },

  downloadPdf: async (filename: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/records/pdf/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getByUserId: async (userId: number): Promise<Record[]> => {
    const response = await apiClient.get(`/api/records/user/${userId}`);
    return response.data;
  },
};

