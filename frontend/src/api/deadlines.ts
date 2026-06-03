import { apiClient } from './client';
import { Deadline, DeadlineDto, DeadlineAdminFilters, PageResponse } from '../types';

export const deadlinesApi = {
  getRelevant: (): Promise<Deadline[]> =>
    apiClient.get('/api/deadlines').then(r => r.data),

  getAdmin: (filters: DeadlineAdminFilters = {}): Promise<PageResponse<Deadline>> =>
    apiClient.get('/api/deadlines/admin', { params: filters }).then(r => r.data),

  getById: (id: number): Promise<Deadline> =>
    apiClient.get(`/api/deadlines/${id}`).then(r => r.data),

  create: (dto: DeadlineDto): Promise<Deadline> =>
    apiClient.post('/api/deadlines', dto).then(r => r.data),

  update: (id: number, dto: DeadlineDto): Promise<Deadline> =>
    apiClient.put(`/api/deadlines/${id}`, dto).then(r => r.data),

  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/deadlines/${id}`).then(() => undefined),

  notifyNow: (id: number): Promise<void> =>
    apiClient.post(`/api/deadlines/${id}/notify`).then(() => undefined),
};
