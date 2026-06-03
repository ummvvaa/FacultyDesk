import { apiClient } from './client';
import { PinnedItem, PinnedItemType, PinCheckResult } from '../types';

export const pinsApi = {
  list: () =>
    apiClient.get<PinnedItem[]>('/api/pins').then(r => r.data),

  pin: (payload: {
    type: PinnedItemType;
    itemId?: number;
    pagePath?: string;
    customTitle?: string;
  }) =>
    apiClient.post<PinnedItem>('/api/pins', payload).then(r => r.data),

  unpin: (id: number) =>
    apiClient.delete(`/api/pins/${id}`),

  reorder: (pinIds: number[]) =>
    apiClient.put('/api/pins/reorder', { pinIds }),

  check: (type: PinnedItemType, itemId?: number, pagePath?: string) => {
    const params = new URLSearchParams({ type });
    if (itemId != null) params.set('itemId', String(itemId));
    if (pagePath) params.set('pagePath', pagePath);
    return apiClient.get<PinCheckResult>(`/api/pins/check?${params}`).then(r => r.data);
  },
};
