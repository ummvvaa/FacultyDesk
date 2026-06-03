import React from 'react';
import { Bookmark, BookmarkPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pinsApi } from '../../api/pins';
import { PinnedItemType } from '../../types';
import { toast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';

interface PinButtonProps {
  type: PinnedItemType;
  itemId?: number;
  pagePath?: string;
  customTitle?: string;
  className?: string;
}

export default function PinButton({ type, itemId, pagePath, customTitle, className }: PinButtonProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const checkKey = ['pin-check', type, itemId, pagePath];

  const { data: checkResult } = useQuery({
    queryKey: checkKey,
    queryFn: () => pinsApi.check(type, itemId, pagePath),
    enabled: !!(itemId || pagePath),
  });

  const pinMutation = useMutation({
    mutationFn: () => pinsApi.pin({ type, itemId, pagePath, customTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pins'] });
      qc.invalidateQueries({ queryKey: checkKey });
      toast({ description: t('pinned.pinned') });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || t('pinned.maxReached');
      toast({ description: msg, variant: 'destructive' });
    },
  });

  const unpinMutation = useMutation({
    mutationFn: (pinId: number) => pinsApi.unpin(pinId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pins'] });
      qc.invalidateQueries({ queryKey: checkKey });
      toast({ description: t('pinned.unpinned') });
    },
  });

  const isPinned = checkResult?.pinned ?? false;
  const pinId = checkResult?.pinId;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (isPinned && pinId) {
      unpinMutation.mutate(pinId);
    } else {
      pinMutation.mutate();
    }
  }

  const isLoading = pinMutation.isPending || unpinMutation.isPending;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      title={isPinned ? t('pinned.unpin') : t('pinned.pin')}
      className={cn(
        'rounded-md p-1 transition-all',
        isPinned
          ? 'text-primary hover:text-destructive'
          : 'text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary',
        className
      )}
    >
      {isPinned
        ? <Bookmark className="h-3.5 w-3.5 fill-current" />
        : <BookmarkPlus className="h-3.5 w-3.5" />
      }
    </button>
  );
}
