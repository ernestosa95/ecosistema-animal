import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Persona, Animal } from '../api/types';

/**
 * Cachea personas + animales de la organización en memoria (ambos endpoints
 * ya devuelven la lista completa sin paginar, como el resto de la web) para
 * que el Omnibox no dispare un fetch nuevo en cada apertura. `refrescar()`
 * fuerza una recarga manual.
 */
export function useEntidadesBusqueda(sesion: Sesion | null) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargadoUnaVez, setCargadoUnaVez] = useState(false);

  const refrescar = useCallback(async () => {
    if (!sesion) return;
    setCargando(true);
    try {
      const [p, a] = await Promise.all([api.personas(sesion), api.animales(sesion)]);
      setPersonas(p);
      setAnimales(a);
      setCargadoUnaVez(true);
    } finally {
      setCargando(false);
    }
  }, [sesion]);

  useEffect(() => {
    if (sesion && !cargadoUnaVez) refrescar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  return { personas, animales, cargando, refrescar };
}
