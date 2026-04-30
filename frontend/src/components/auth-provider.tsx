"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { jsonFetch } from "@/lib/fetch";

type AuthUser = Record<string, unknown>;

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: Record<string, unknown>) => Promise<{ ok: true } | { ok: false; error: unknown }>;
  register: (payload: Record<string, unknown>) => Promise<{ ok: true } | { ok: false; error: unknown }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const result = await jsonFetch("/api/auth/session", { method: "GET" });
    setUser(result.data?.user ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshSession]);

  const login = useCallback(async (payload: Record<string, unknown>) => {
    const result = await jsonFetch("/api/auth/login", { method: "POST", json: payload });
    if (!result.ok) return { ok: false as const, error: result.data };
    setUser(result.data?.user ?? null);
    return { ok: true as const };
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    const result = await jsonFetch("/api/auth/register", { method: "POST", json: payload });
    if (!result.ok) return { ok: false as const, error: result.data };
    setUser(result.data?.user ?? null);
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await jsonFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout, refreshSession }),
    [user, isLoading, login, register, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

