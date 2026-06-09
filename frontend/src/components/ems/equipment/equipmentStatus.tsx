import React from 'react';
import { cn } from '@/lib/utils';

export type EmsEquipmentStatus = 'OVERDUE' | 'DUE SOON' | 'OK' | 'NO WO' | string;

export function emsStatusBadgeClass(status: string): string {
  switch (status) {
    case 'OVERDUE':
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    case 'DUE SOON':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100';
    case 'OK':
      return 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100';
    case 'NO WO':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function emsStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'OVERDUE':
      return t('ems.status.overdue');
    case 'DUE SOON':
      return t('ems.status.dueSoon');
    case 'OK':
      return t('ems.status.ok');
    case 'NO WO':
      return t('ems.status.noWo');
    default:
      return status;
  }
}

export function EmsStatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        emsStatusBadgeClass(status),
        className
      )}
    >
      {label ?? status}
    </span>
  );
}
