'use client';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export function ToastContainer() {
  const { toasts, remove } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((t) => {
        const styles = {
          success: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#22c55e', icon: <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> },
          error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#ef4444', icon: <AlertCircle className="w-5 h-5" aria-hidden="true" /> },
          warning: { bg: 'rgba(251, 146, 60, 0.1)', border: '#fb923c', text: '#fb923c', icon: <AlertTriangle className="w-5 h-5" aria-hidden="true" /> },
          info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6', icon: <Info className="w-5 h-5" aria-hidden="true" /> }
        };
        const style = styles[t.type];

        return (
          <div
            key={t.id}
            className="flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm animate-slide-in-right pointer-events-auto"
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              color: 'var(--foreground)'
            }}
            role="alert"
          >
            <div style={{ color: style.text }}>{style.icon}</div>
            <p className="flex-1 text-sm font-medium">
              {t.message}
            </p>
            <button
              onClick={() => remove(t.id)}
              className="hover:opacity-70 transition-opacity"
              aria-label="Fechar notificação"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
