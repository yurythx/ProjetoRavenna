'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { ComponentProps, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  const { user, token } = useAuth();
  const { theme, setTheme } = useNextTheme();

  // Sync with cookies for SSR/initial load
  useEffect(() => {
    if (!theme) return;
    const d = new Date();
    d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `theme=${encodeURIComponent(theme)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }, [theme]);

  // Sync with User Profile when logged in
  useEffect(() => {
    if (user?.theme_preference && user.theme_preference !== theme) {
      setTheme(user.theme_preference);
    }
  }, [user?.theme_preference]);

  // Optionally: Update backend when theme is manually changed
  const handleThemeChange = useCallback(async (newTheme: string) => {
    setTheme(newTheme);
    if (token && user) {
      try {
        await api.patch('/auth/profile/', { theme_preference: newTheme });
      } catch (error) {
        console.error('Failed to update theme preference on server', error);
      }
    }
  }, [token, user, setTheme]);

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
      {children}
    </NextThemesProvider>
  );
}

// We need to export a custom hook or return handleThemeChange to actually sync back
export function useTheme() {
  const { theme, setTheme, ...rest } = useNextTheme();
  const { user, token } = useAuth();

  const setPersistedTheme = async (newTheme: string) => {
    setTheme(newTheme);
    if (token && user) {
      try {
        await api.patch('/auth/profile/', { theme_preference: newTheme });
      } catch (error) {
        console.error('Failed to sync theme to backend', error);
      }
    }
  };

  return { ...rest, theme, setTheme: setPersistedTheme };
}
