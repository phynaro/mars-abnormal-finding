export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description: string;
  variant: ToastVariant;
}

export interface ToastOptions {
  title: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

export { useToastContext as useToast } from '@/contexts/ToastContext';
