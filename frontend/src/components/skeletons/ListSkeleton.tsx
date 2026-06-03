import React from 'react';
import { Skeleton } from '../ui/skeleton';

interface ListSkeletonProps {
  rows?: number;
}

const ListSkeleton: React.FC<ListSkeletonProps> = ({ rows = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListSkeleton;
