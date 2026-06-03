import React from 'react';
import { Skeleton } from '../ui/skeleton';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* 4 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      {/* 2 chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-1/3 mb-4" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
