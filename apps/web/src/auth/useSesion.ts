import { useState } from 'react';
import type { Sesion } from '../api/types';

const CLAVE = 'ecosistema.sesion';

function cargar(): Sesion | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Sesion) : null;
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

  return { sesion, iniciar, cerrar };
}
