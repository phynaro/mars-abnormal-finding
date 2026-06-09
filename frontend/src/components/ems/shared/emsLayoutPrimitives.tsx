import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Standard page content wrapper — matches `p-4 sm:p-6 space-y-6` used elsewhere. */
export function EmsPageStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-6', className)}>{children}</div>;
}

/** Filter bar shell — dashed Card like Calibration V2 dashboard. */
export function EmsFilterCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border-dashed shadow-none', className)}>
      <CardContent className="pt-4 pb-4">{children}</CardContent>
    </Card>
  );
}

/** Table / list shell with optional header row. */
export function EmsContentCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn('overflow-hidden shadow-sm', className)}>
      {(title || description) && (
        <div className="border-b px-4 py-3 sm:px-6">
          {title && <h3 className="text-sm font-semibold leading-none">{title}</h3>}
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
          )}
        </div>
      )}
      <CardContent className={cn('p-0', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/** Centered empty state inside a card. */
export function EmsEmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Card className={cn('border-dashed shadow-none', className)}>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export default EmsPageStack;
