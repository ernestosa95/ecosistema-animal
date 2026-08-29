import { useState } from 'react';
import type { Sesion } from '../api/types';

const CLAVE = 'ecosistema.sesion';

function cargar(): Sesion | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const sesion = JSON.parse(raw) as Sesion;
    // Sesiones guardadas antes de que `rol` pasara a `roles` (arreglo) no
    // tienen esta propiedad — descartarlas en vez de romper el arranque.
    if (!Array.isArray(sesion.roles)) {
      localStorage.removeItem(CLAVE);
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

export function useSesion() {
  const [sesion, setSesionState] = useState<Sesion | null>(cargar);

  function iniciar(nueva: Sesion) {
    localStorage.setItem(CLAVE, JSON.stringify(nueva));
    setSesionState(nueva);
  }

  function cerrar() {
    localStorage.removeItem(CLAVE);
    setSesionState(null);
  }

  /** Reemplaza sólo los tokens (tras un refresh silencioso), sin tocar organizacionId/rol. */
  function actualizarTokens(token: string, refreshToken: string) {
    setSesionState((actual) => {
      if (!actual) return actual;
      const nueva = { ...actual, token, refreshToken };
      localStorage.setItem(CLAVE, JSON.stringify(nueva));
      return nueva;
    });
  }

  return { sesion, iniciar, cerrar, actualizarTokens };
}
