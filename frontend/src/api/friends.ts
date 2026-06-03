import { apiClient } from './client';
import { Friendship, User } from '../types';

export const friendsApi = {
  sendRequest: async (userId: number): Promise<Friendship> => {
    const response = await apiClient.post(`/api/friends/request/${userId}`);
    return response.data;
  },

  acceptRequest: async (friendshipId: number): Promise<Friendship> => {
    const response = await apiClient.put(`/api/friends/accept/${friendshipId}`);
    return response.data;
  },

  rejectRequest: async (friendshipId: number): Promise<void> => {
    await apiClient.put(`/api/friends/reject/${friendshipId}`);
  },

  getPending: async (): Promise<Friendship[]> => {
    const response = await apiClient.get('/api/friends/pending');
    return response.data;
  },

  getFriends: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/friends');
    return response.data;
  },

  getFriendshipStatus: async (userId: number): Promise<string> => {
    const response = await apiClient.get(`/api/friends/status/${userId}`);
    return response.data.status;
  },

  getFriendship: async (userId: number): Promise<Friendship | null> => {
    const response = await apiClient.get(`/api/friends/friendship/${userId}`);
    return response.data.id ? response.data : null;
  },
};

