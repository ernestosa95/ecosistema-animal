import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { sincronizar } from './sync';
import { useSesionContext } from '../auth/SesionContext';

type Estado = 'idle' | 'syncing' | 'ok' | 'error';

interface SyncContextValue {
  estado: Estado;
  ultima: Date | null;
  error: string | null;
  sincronizarAhora: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const INTERVALO_MS = 2 * 60 * 1000;

/**
 * Reemplaza la pestaña "Sincronización" (manual) por un motor automático:
 * sincroniza al detectar red disponible y cada `INTERVALO_MS` como respaldo
 * mientras la app está abierta — el usuario ya no tiene que acordarse de
 * tocar un botón. El estado se expone acá para que `EncabezadoApp` lo
 * muestre como una barrita fija en vez de una pantalla propia.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { sesion } = useSesionContext();
  const [estado, setEstado] = useState<Estado>('idle');
  const [ultima, setUltima] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enCursoRef = useRef(false);
  const sesionRef = useRef(sesion);
  sesionRef.current = sesion;

  async function ejecutar() {
    const s = sesionRef.current;
    if (!s || enCursoRef.current) return;
    enCursoRef.current = true;
    setEstado('syncing');
    setError(null);
    try {
      await sincronizar(s);
      setUltima(new Date());
      setEstado('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar');
      setEstado('error');
    } finally {
      enCursoRef.current = false;
    }
  }

  useEffect(() => {
    if (!sesion) return;
    ejecutar();
    const unsub = NetInfo.addEventListener((estadoRed) => {
      if (estadoRed.isConnected && estadoRed.isInternetReachable !== false) ejecutar();
    });
    const intervalo = setInterval(ejecutar, INTERVALO_MS);
    return () => {
      unsub();
      clearInterval(intervalo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.organizacionId]);

  return (
    <SyncContext.Provider value={{ estado, ultima, error, sincronizarAhora: ejecutar }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncContext debe usarse dentro de <SyncProvider>');
  return ctx;
}
