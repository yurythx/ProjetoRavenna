'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ModuleState = Record<string, boolean>;
type ModuleContextType = {
  disabled: ModuleState;
  reset: (module: string) => void;
};

const ModuleContext = createContext<ModuleContextType | null>(null);

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [disabled, setDisabled] = useState<ModuleState>({});

  useEffect(() => {
    function onDisabled(e: Event) {
      const ce = e as CustomEvent<{ module?: string }>;
      const name = ce.detail?.module || 'unknown';
      setDisabled((d) => ({ ...d, [name]: true }));
    }
    window.addEventListener('module-disabled', onDisabled as EventListener);
    return () => window.removeEventListener('module-disabled', onDisabled as EventListener);
  }, []);

  function reset(module: string) {
    setDisabled((d) => {
      const next = { ...d };
      delete next[module];
      return next;
    });
  }

  const value = useMemo(() => ({ disabled, reset }), [disabled]);
  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
}

export function useModules() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error('useModules must be used within ModuleProvider');
  return ctx;
}

