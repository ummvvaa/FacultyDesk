import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generatedDocumentsApi } from '../api/generatedDocuments';
import { GeneratedDocumentAdminFilters, GeneratedDocStatus } from '../types';

export function useMyGeneratedDocuments() {
  return useQuery({
    queryKey: ['generated-documents', 'me'],
    queryFn: () => generatedDocumentsApi.getMy(),
  });
}

export function useAdminGeneratedDocuments(filters?: GeneratedDocumentAdminFilters) {
  return useQuery({
    queryKey: ['generated-documents', 'admin', filters],
    queryFn: () => generatedDocumentsApi.getAdminAll(filters),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });
}

export function useUpdateGeneratedDocStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: GeneratedDocStatus; comment?: string }) =>
      generatedDocumentsApi.updateStatus(id, status, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['generated-documents'] });
    },
  });
}

export function useDeleteGeneratedDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => generatedDocumentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['generated-documents'] });
    },
  });
}
