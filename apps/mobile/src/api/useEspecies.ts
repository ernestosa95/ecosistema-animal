import { useEffect, useState } from 'react';
import { api, type Especie } from './client';
import { useSesionContext } from '../auth/SesionContext';

// Catálogo global (no depende de organización, no cambia en runtime) —
// se cachea en memoria en vez de guardarse en WatermelonDB, que está
// reservado a lo que hay que sincronizar/escribir offline.
let cache: Especie[] | null = null;

export function useEspecies() {
  const { sesion } = useSesionContext();
  const [especies, setEspecies] = useState<Especie[]>(cache ?? []);
  const [cargando, setCargando] = useState(!cache);

  useEffect(() => {
    if (cache || !sesion) {
      setCargando(false);
      return;
    }
    api
      .especies(sesion)
      .then((data) => {
        cache = data;
        setEspecies(data);
      })
      .finally(() => setCargando(false));
  }, [sesion]);

  return { especies, cargando };
}
