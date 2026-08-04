import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Shared status helper is intentionally exported for non-UI feature consumers.
// eslint-disable-next-line react-refresh/only-export-components
export function emsWoStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Done':
      return 'bg-green-100 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100';
    case 'In Progress':
      return 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100';
    case 'Pending':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function EmsWoStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', emsWoStatusBadgeClass(status))}>
      {status}
    </Badge>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatScheduleDueDays(
  daysUntilDue: number | null | undefined,
  t: (key: string) => string
): { text: string; className: string } {
  if (daysUntilDue == null || Number.isNaN(daysUntilDue)) {
    return { text: '—', className: 'text-muted-foreground' };
  }
  if (daysUntilDue < 0) {
    const overdue = Math.abs(daysUntilDue);
    return {
      text: t('ems.schedule.daysOverdue').replace('{n}', String(overdue)),
      className: 'text-destructive font-medium',
    };
  }
  if (daysUntilDue === 0) {
    return { text: t('ems.schedule.dueToday'), className: 'text-amber-600 font-medium' };
  }
  return {
    text: t('ems.schedule.daysUntil').replace('{n}', String(daysUntilDue)),
    className: 'text-green-700 dark:text-green-400',
  };
}
