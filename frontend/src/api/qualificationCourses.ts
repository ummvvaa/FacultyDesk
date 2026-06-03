import { apiClient } from './client';
import { QualificationCourse } from '../types';

export const qualificationCoursesApi = {
  getMy: async (): Promise<QualificationCourse[]> => {
    const { data } = await apiClient.get('/api/qualification-courses/me');
    return data;
  },

  getByUser: async (userId: number): Promise<QualificationCourse[]> => {
    const { data } = await apiClient.get(`/api/qualification-courses/user/${userId}`);
    return data;
  },

  create: async (payload: Partial<QualificationCourse>): Promise<QualificationCourse> => {
    const { data } = await apiClient.post('/api/qualification-courses', payload);
    return data;
  },

  update: async (id: number, payload: Partial<QualificationCourse>): Promise<QualificationCourse> => {
    const { data } = await apiClient.put(`/api/qualification-courses/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/qualification-courses/${id}`);
  },

  uploadCertificate: async (id: number, file: File): Promise<QualificationCourse> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `/api/qualification-courses/${id}/certificate`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  downloadCertificate: async (id: number, filename: string): Promise<void> => {
    const response = await apiClient.get(`/api/qualification-courses/${id}/certificate/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
