import { apiClient } from './client';
import { AssistantChatResponse, AssistantConversation, AssistantMessage } from '../types';

export const assistantApi = {
  chat: async (
    message: string,
    conversationId?: number,
    locale?: string
  ): Promise<AssistantChatResponse> => {
    const response = await apiClient.post('/api/ai/assistant/chat', {
      message,
      conversationId,
      locale,
    });
    return response.data;
  },

  listConversations: async (): Promise<AssistantConversation[]> => {
    const response = await apiClient.get('/api/ai/assistant/conversations');
    return response.data;
  },

  getMessages: async (conversationId: number): Promise<AssistantMessage[]> => {
    const response = await apiClient.get(
      `/api/ai/assistant/conversations/${conversationId}/messages`
    );
    return response.data;
  },

  deleteConversation: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/ai/assistant/conversations/${id}`);
  },

  askKkkTutor: async (question: string, locale = 'ru'): Promise<{ answer: string }> => {
    const response = await apiClient.post(
      '/api/ai/assistant/kkk-tutor/ask',
      { question },
      { params: { locale } }
    );
    return response.data;
  },
};
