import { useEffect, useRef, useState } from 'react';

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

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const toast = ({
    title,
    description,
    variant = 'default',
    duration = 5000,
  }: ToastOptions) => {
    const id = Math.random().toString(36).slice(2, 11);
    const newToast: Toast = { id, title, description, variant };

    setToasts((prev) => [...prev, newToast]);

    timers.current[id] = setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  };

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, []);

  return { toast, toasts, removeToast };
};
