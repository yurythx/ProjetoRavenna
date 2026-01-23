'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type User = {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  role?: string;
  is_staff?: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  primary_color?: string;
  secondary_color?: string;
  primary_color_dark?: string;
  secondary_color_dark?: string;
};

type AuthState = { token: string | null; user: User | null; isLoading: boolean };

type AuthContextType = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function setCookie(name: string, value: string, days?: number) {
  if (typeof document === 'undefined') return;
  const d = new Date();
  const base = `${name}=${encodeURIComponent(value)};path=/`;
  if (typeof days === 'number' && days > 0) {
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${base};expires=${d.toUTCString()}`;
  } else {
    document.cookie = base;
  }
}
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; path=/`;
}
function getTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, user: null, isLoading: true });

  const fetchUser = async (token: string) => {
    try {
      const { data } = await api.get('/auth/profile/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getTokenFromCookie();
      if (token) {
        const user = await fetchUser(token);
        if (user) {
          setState({ token, user, isLoading: false });
        } else {
          // Token invalid or profile fetch failed
          deleteCookie('auth_token');
          deleteCookie('refresh_token');
          setState({ token: null, user: null, isLoading: false });
        }
      } else {
        setState({ token: null, user: null, isLoading: false });
      }
    };
    initAuth();
  }, []);

  async function login(identifier: string, password: string, remember?: boolean) {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { data } = await api.post('/auth/token/', { email: identifier, password });
      setCookie('auth_token', data.access, remember ? 7 : undefined);
      setCookie('refresh_token', data.refresh, remember ? 7 : undefined);

      const user = await fetchUser(data.access);
      setState({ token: data.access, user, isLoading: false });
    } catch (e) {
      setState({ token: null, user: null, isLoading: false });
      throw e;
    }
  }

  function logout() {
    deleteCookie('auth_token');
    deleteCookie('refresh_token');
    setState({ token: null, user: null, isLoading: false });
  }

  async function refreshUser() {
    if (state.token) {
      const user = await fetchUser(state.token);
      setState(s => ({ ...s, user }));
    }
  }

  const value = useMemo(() => ({ ...state, login, logout, refreshUser }), [state.token, state.user, state.isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

