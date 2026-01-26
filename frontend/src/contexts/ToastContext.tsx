'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type Toast = { message: string; type?: 'success' | 'error' | 'info' };

const ToastContext = createContext<{ show: (t: Toast) => void; success: (m: string) => void; error: (m: string) => void; info: (m: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = (t: Toast) => setToasts((prev) => [...prev, t]);
  const success = (m: string) => show({ message: m, type: 'success' });
  const error = (m: string) => show({ message: m, type: 'error' });
  const info = (m: string) => show({ message: m, type: 'info' });
  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t, i) => (
          <div key={i} className={`toast ${t.type === 'success' ? 'toast-success' : t.type === 'error' ? 'toast-error' : 'toast-info'}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => {}, success: () => {}, error: () => {}, info: () => {} };
}
