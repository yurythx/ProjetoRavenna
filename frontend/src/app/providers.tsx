'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModuleProvider } from '@/contexts/ModuleContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ModuleProvider>
            <ToastProvider>{children}</ToastProvider>
          </ModuleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
