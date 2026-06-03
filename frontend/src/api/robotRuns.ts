import { apiClient } from './client';
import { RobotRun, PageResponse } from '../types';

const API = '/api/robot/runs';

export const robotRunsApi = {
  getAll: async (page = 0, size = 20): Promise<PageResponse<RobotRun>> => {
    const res = await apiClient.get(API, { params: { page, size, sort: 'startedAt,desc' } });
    return res.data;
  },

  getById: async (id: number): Promise<RobotRun> => {
    const res = await apiClient.get(`${API}/${id}`);
    return res.data;
  },

  getLatest: async (): Promise<RobotRun | null> => {
    const res = await apiClient.get(`${API}/latest`);
    if (res.data?.message) return null;
    return res.data;
  },

  start: async (sourceFile: string): Promise<{ id: number; startedAt: string }> => {
    const res = await apiClient.post(`${API}/start`, { sourceFile });
    return res.data;
  },

  finish: async (id: number, body: {
    status: string;
    processedCount?: number;
    errorCount?: number;
    generatedCount?: number;
    errorLog?: string;
    summary?: string;
  }): Promise<RobotRun> => {
    const res = await apiClient.put(`${API}/${id}/finish`, body);
    return res.data;
  },

  rollback: async (runId: number): Promise<void> => {
    await apiClient.post(`${API}/${runId}/rollback`);
  },

  uploadAndRun: async (file: File): Promise<{ message: string; filename: string; status: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiClient.post('/api/admin/robot/upload-and-run', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
