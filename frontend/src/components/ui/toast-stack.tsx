import React from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';
import type { Toast, ToastVariant } from '@/hooks/useToast';

interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-slate-400" aria-hidden="true" />,
  success: (
    <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
  ),
  warning: (
    <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
  ),
  destructive: (
    <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />
  ),
};

const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
          role="status"
          aria-live="polite"
        >
          <span className="mt-1 flex-shrink-0" aria-hidden="true">
            {variantIcon[toast.variant]}
          </span>
          <div className="flex-1 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-medium text-slate-900 dark:text-slate-50">
              {toast.title}
            </p>
            {toast.description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="mt-1 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
