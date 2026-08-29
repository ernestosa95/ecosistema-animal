import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useSesion, type Sesion } from './useSesion';
import { configurarRefrescoSesion } from '../api/client';

interface SesionContextValue {
  sesion: Sesion | null;
  cargando: boolean;
  iniciar: (s: Sesion) => Promise<void>;
  cerrar: () => Promise<void>;
}

const SesionContext = createContext<SesionContextValue | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const { sesion, cargando, iniciar, cerrar, actualizarTokens } = useSesion();

  useEffect(() => {
    configurarRefrescoSesion((tokens) => {
      actualizarTokens(tokens.accessToken, tokens.refreshToken);
    });
  }, [actualizarTokens]);

  return (
    <SesionContext.Provider value={{ sesion, cargando, iniciar, cerrar }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesionContext() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesionContext debe usarse dentro de <SesionProvider>');
  return ctx;
}
