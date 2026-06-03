import { apiClient } from './client';
import {
  KkkGapAnalysis,
  PublicationFieldSuggestions,
  PublicationMetadata,
  TeacherSearchResult,
  TemplateRecommendation,
} from '../types';

export const aiApi = {
  recommendTemplates: async (query: string, limit: number = 5): Promise<TemplateRecommendation[]> => {
    const response = await apiClient.post('/api/ai/templates/recommend', { query, limit });
    return response.data;
  },

  searchTeachers: async (query: string, limit: number = 10): Promise<TeacherSearchResult[]> => {
    const response = await apiClient.get('/api/ai/teachers/search', {
      params: { query, limit },
    });
    return response.data;
  },

  extractPublicationMetadata: async (file: File): Promise<PublicationMetadata> => {
    const form = new FormData();
    form.append('pdf', file);
    const response = await apiClient.post('/api/ai/publications/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  analyzeKkkGaps: async (locale: string = 'ru'): Promise<KkkGapAnalysis> => {
    const response = await apiClient.get('/api/ai/profile/check', { params: { locale } });
    return response.data;
  },

  generateProfileSummary: async (locale: string = 'ru'): Promise<{ summary: string }> => {
    const response = await apiClient.get('/api/ai/profile/summary', { params: { locale } });
    return response.data;
  },

  saveProfileSummary: async (summary: string): Promise<{ summary: string }> => {
    const response = await apiClient.post('/api/ai/profile/summary/save', { summary });
    return response.data;
  },

  generateRecordDescription: async (
    title: string,
    categoryId?: number,
    locale = 'ru'
  ): Promise<{ description: string }> => {
    const response = await apiClient.post(
      '/api/ai/records/generate-description',
      { title, categoryId },
      { params: { locale } }
    );
    return response.data;
  },

  suggestPublicationFields: async (
    journalName: string,
    locale = 'ru'
  ): Promise<PublicationFieldSuggestions> => {
    const response = await apiClient.get('/api/ai/publications/suggest-fields', {
      params: { journalName, locale },
    });
    return response.data;
  },
};
