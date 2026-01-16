'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { ComponentProps, useEffect } from 'react';

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  const SyncCookie = () => {
    const { theme } = useNextTheme();
    useEffect(() => {
      if (!theme) return;
      const d = new Date();
      d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
      document.cookie = `theme=${encodeURIComponent(theme)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    }, [theme]);
    return null;
  };

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      storageKey="theme"
      disableTransitionOnChange
      {...props}
    >
      <SyncCookie />
      {children}
    </NextThemesProvider>
  );
}

export const useTheme = useNextTheme;
