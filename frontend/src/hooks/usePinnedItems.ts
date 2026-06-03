import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pinsApi } from '../api/pins';
import { PinnedItemType } from '../types';

export function usePinnedItems() {
  return useQuery({
    queryKey: ['pins'],
    queryFn: pinsApi.list,
  });
}

export function usePinMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pinsApi.pin,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pins'] }),
  });
}

export function useUnpinMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pinsApi.unpin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pins'] }),
  });
}

export function useReorderPinsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pinIds: number[]) => pinsApi.reorder(pinIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pins'] }),
  });
}

export function usePinCheck(type: PinnedItemType, itemId?: number, pagePath?: string) {
  return useQuery({
    queryKey: ['pin-check', type, itemId, pagePath],
    queryFn: () => pinsApi.check(type, itemId, pagePath),
    enabled: !!(itemId || pagePath),
  });
}
