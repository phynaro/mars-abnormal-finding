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
  compact?: boolean;
}

export function EmsKpiStat({
  label,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
  loading,
  compact,
}: EmsKpiStatProps) {
  if (compact) {
    return (
      <div className="flex h-full flex-col rounded-lg bg-muted/40 px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
          <span className="truncate">{label}</span>
        </p>
        <div className="flex flex-1 items-center justify-center">
          {loading ? (
            <Skeleton className="h-6 w-12" />
          ) : (
            <p className={cn('text-xl font-bold tabular-nums leading-none', valueClassName)}>
              {value ?? '—'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="shadow-sm h-full">
      <CardContent className={cn(compact ? 'p-3' : 'pt-5 pb-5')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn('text-muted-foreground truncate', compact ? 'text-xs' : 'text-sm')}>{label}</p>
            {loading ? (
              <Skeleton className={cn('mt-1', compact ? 'h-7 w-12' : 'h-9 w-16 mt-2')} />
            ) : (
              <p className={cn('font-bold tabular-nums mt-0.5', compact ? 'text-xl' : 'text-3xl mt-1', valueClassName)}>
                {value ?? '—'}
              </p>
            )}
          </div>
          <div
            className={cn(
              'shrink-0 rounded-lg bg-muted text-muted-foreground',
              compact ? 'p-1.5' : 'p-2.5',
              iconClassName
            )}
          >
            <Icon className={cn(compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmsKpiGridProps {
  children: React.ReactNode;
  columns?: '2' | '3' | '5';
  className?: string;
}

export function EmsKpiGrid({ children, columns = '5', className }: EmsKpiGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === '2'
          ? 'grid-cols-2'
          : columns === '3'
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
