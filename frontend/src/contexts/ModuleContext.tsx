import { createContext, useContext, useState, ReactNode } from 'react';

type Module = { slug: string; is_active: boolean };
type ModuleContextValue = { modules: Module[]; disabled?: boolean };

const Ctx = createContext<ModuleContextValue>({ modules: [], disabled: false });

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [modules] = useState<Module[]>([]);
  return <Ctx.Provider value={{ modules, disabled: false }}>{children}</Ctx.Provider>;
}

export function useModules() {
  return useContext(Ctx);
}
