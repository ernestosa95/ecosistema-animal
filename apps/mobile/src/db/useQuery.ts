import { useEffect, useState } from 'react';
import type { Model, Query } from '@nozbe/watermelondb';

/**
 * Suscripción reactiva a una Query de WatermelonDB (rxjs Observable de
 * .observe()). Recibe una factory en vez de la Query ya armada porque un
 * objeto Query nuevo en cada render no es una dependencia estable para
 * useEffect — el llamador controla cuándo debe re-suscribirse vía `deps`.
 */
export function useObservedQuery<T extends Model>(getQuery: () => Query<T>, deps: unknown[]): T[] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    const sub = getQuery().observe().subscribe(setItems);
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return items;
}
