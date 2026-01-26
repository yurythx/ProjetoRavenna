import { ToastProvider } from '@/contexts/ToastContext';

export function ToastContainer({ children }: { children?: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
