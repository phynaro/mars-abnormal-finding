import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type WorkOrderStatus = 'ontime' | 'late' | 'not_finish';

function workOrderStatusLabel(status: WorkOrderStatus, t: (key: string) => string): string {
  if (status === 'ontime') return t('ems.workOrders.statusOntime');
  if (status === 'late') return t('ems.workOrders.statusLate');
  return t('ems.workOrders.statusNotFinish');
}

function workOrderStatusClass(status: WorkOrderStatus): string {
  if (status === 'ontime') {
    return 'bg-green-100 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100';
  }
  if (status === 'late') {
    return 'bg-red-100 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100';
  }
  return 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100';
}

export function WorkOrderStatusBadge({
  status,
  t,
}: {
  status: WorkOrderStatus;
  t: (key: string) => string;
}) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', workOrderStatusClass(status))}>
      {workOrderStatusLabel(status, t)}
    </Badge>
  );
}
