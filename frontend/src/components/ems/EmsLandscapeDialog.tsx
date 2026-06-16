import React from 'react';

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export const EMS_LANDSCAPE_DIALOG_CONTENT_CLASS =
  'w-[calc(100vw-2rem)] max-w-6xl max-h-[min(90vh,820px)] p-0 gap-0 overflow-hidden flex flex-col';

interface ShellProps {
  children: React.ReactNode;
  className?: string;
}

export function EmsLandscapeDialogContent({ children, className }: ShellProps) {
  return (
    <DialogContent className={cn(EMS_LANDSCAPE_DIALOG_CONTENT_CLASS, className)}>{children}</DialogContent>
  );
}

export function EmsLandscapeDialogHeader({ children, className }: ShellProps) {
  return (
    <DialogHeader className={cn('shrink-0 space-y-1 border-b px-6 py-4 pr-12 text-left', className)}>
      {children}
    </DialogHeader>
  );
}

export function EmsLandscapeDialogBody({ children, className }: ShellProps) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)}>{children}</div>;
}

export function EmsLandscapeDialogFooter({ children, className }: ShellProps) {
  return (
    <DialogFooter className={cn('shrink-0 border-t px-6 py-4 gap-2 sm:justify-end', className)}>
      {children}
    </DialogFooter>
  );
}

export function EmsLandscapeDialogSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export { DialogTitle, DialogDescription };
