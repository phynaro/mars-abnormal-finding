import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface EmsKpiStatProps {
  label: string;
  value: number | string | null | undefined;
  icon: LucideIcon;
  iconClassName?: string;
  valueClassName?: string;
  loading?: boolean;
}

export function EmsKpiStat({
  label,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
  loading,
}: EmsKpiStatProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-9 w-16 mt-2" />
            ) : (
              <p className={cn('text-3xl font-bold tabular-nums mt-1', valueClassName)}>
                {value ?? '—'}
              </p>
            )}
          </div>
          <div
            className={cn(
              'shrink-0 rounded-lg p-2.5 bg-muted text-muted-foreground',
              iconClassName
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmsKpiGridProps {
  children: React.ReactNode;
  columns?: '3' | '5';
  className?: string;
}

export function EmsKpiGrid({ children, columns = '5', className }: EmsKpiGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === '3'
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-2 lg:grid-cols-5',
        className
      )}
    >
      {children}
    </div>
  );
}

export default EmsKpiStat;
