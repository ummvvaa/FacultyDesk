import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicationsApi } from '../api/publications';
import { PublicationDto, PublicationAdminFilters } from '../types';

export function useMyPublications() {
  return useQuery({
    queryKey: ['publications', 'me'],
    queryFn: () => publicationsApi.getMyPublications(),
  });
}

export function useAdminPublications(filters?: PublicationAdminFilters) {
  return useQuery({
    queryKey: ['publications', 'admin', filters],
    queryFn: () => publicationsApi.getAllForAdmin(filters),
    placeholderData: (prev) => prev,
  });
}

export function usePublicationFiles(pubId: number | null) {
  return useQuery({
    queryKey: ['publications', 'files', pubId],
    queryFn: () => publicationsApi.getFiles(pubId!),
    enabled: pubId !== null,
  });
}

export function useCreatePublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PublicationDto) => publicationsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
}

export function useUpdatePublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: PublicationDto }) =>
      publicationsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
}

export function useDeletePublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => publicationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
}

export function useSubmitPublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => publicationsApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
}

export function useVerifyPublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      publicationsApi.verify(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
}

export function useRejectPublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      publicationsApi.reject(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
}

export function useNeedsCorrectionPublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      publicationsApi.needsCorrection(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
}

export function useAddPublicationFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pubId, file, fileType }: { pubId: number; file: File; fileType: string }) =>
      publicationsApi.addFile(pubId, file, fileType),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['publications', 'files', variables.pubId] });
    },
  });
}

export function useDeletePublicationFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, pubId }: { fileId: number; pubId: number }) =>
      publicationsApi.deleteFile(fileId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['publications', 'files', variables.pubId] });
    },
  });
}
