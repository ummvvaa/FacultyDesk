import React from 'react';
import { Skeleton } from '../ui/skeleton';

interface TableRowSkeletonProps {
  rows?: number;
  cols?: number;
}

const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({ rows = 5, cols = 4 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className={`h-4 ${j === 0 ? 'w-3/4' : j === cols - 1 ? 'w-16' : 'w-1/2'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableRowSkeleton;
