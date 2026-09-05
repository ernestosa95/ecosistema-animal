import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'ecosistema.sesion';

export interface Sesion {
  token: string;
  refreshToken: string;
  organizacionId: string;
  roles: string[];
  huellaActiva: boolean;
  troperaActiva: boolean;
}

async function cargar(): Promise<Sesion | null> {
  try {
    const raw = await SecureStore.getItemAsync(CLAVE);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

/** Análogo a apps/web/src/auth/useSesion.ts pero con expo-secure-store (async) en vez de localStorage. */
export function useSesion() {
  const [sesion, setSesionState] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar().then((s) => {
      setSesionState(s);
      setCargando(false);
    });
  }, []);

  async function iniciar(nueva: Sesion) {
    await SecureStore.setItemAsync(CLAVE, JSON.stringify(nueva));
    setSesionState(nueva);
  }

  async function cerrar() {
    await SecureStore.deleteItemAsync(CLAVE);
    setSesionState(null);
  }

  /** Reemplaza sólo los tokens (tras un refresh silencioso), sin tocar organizacionId/rol. */
  async function actualizarTokens(token: string, refreshToken: string) {
    setSesionState((actual) => {
      if (!actual) return actual;
      const nueva = { ...actual, token, refreshToken };
      SecureStore.setItemAsync(CLAVE, JSON.stringify(nueva));
      return nueva;
    });
  }

  return { sesion, cargando, iniciar, cerrar, actualizarTokens };
}
