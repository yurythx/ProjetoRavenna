'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type AuthState = { token: string | null; loading: boolean };

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
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
  const [state, setState] = useState<AuthState>({ token: null, loading: true });

  useEffect(() => {
    const token = getTokenFromCookie();
    setState({ token, loading: false });
  }, []);

  async function login(identifier: string, password: string, remember?: boolean) {
    setState((s) => ({ ...s, loading: true }));
    try {
      const { data } = await api.post('/auth/token/', { email: identifier, password });
      setCookie('auth_token', data.access, remember ? 7 : undefined);
      setCookie('refresh_token', data.refresh, remember ? 7 : undefined);
      setState({ token: data.access, loading: false });
    } catch (e) {
      setState({ token: null, loading: false });
      throw e;
    }
  }

  function logout() {
    deleteCookie('auth_token');
    deleteCookie('refresh_token');
    setState({ token: null, loading: false });
  }

  const value = useMemo(() => ({ ...state, login, logout }), [state.token, state.loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

