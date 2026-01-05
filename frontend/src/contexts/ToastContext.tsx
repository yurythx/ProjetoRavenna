'use client';
import { createContext, useContext, useMemo, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: string; type: ToastType; message: string };
type ToastContextType = {
  toasts: Toast[];
  show: (t: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

function uid() {
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = uid();
    const toast = { ...t, id };
    setToasts((list) => [...list, toast]);
    setTimeout(() => {
      setToasts((list) => list.filter((x) => x.id !== id));
    }, 5000);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const success = useCallback((message: string) => show({ type: 'success', message }), [show]);
  const error = useCallback((message: string) => show({ type: 'error', message }), [show]);
  const info = useCallback((message: string) => show({ type: 'info', message }), [show]);
  const warning = useCallback((message: string) => show({ type: 'warning', message }), [show]);

  const value = useMemo(() => ({ toasts, show, remove, success, error, info, warning }), [toasts, show, remove, success, error, info, warning]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
