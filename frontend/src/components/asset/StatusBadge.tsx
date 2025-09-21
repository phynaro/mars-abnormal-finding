import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const s = (status || '').toUpperCase();
  const color =
    s === 'IN USE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
    s === 'STAND BY' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
    s === 'REPAIR' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
    s === 'SCRAP' ? 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300' :
    'bg-muted text-foreground';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', color, className)}>
      {status || 'N/A'}
    </span>
  );
};

export default StatusBadge;

