import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import { api } from '../api/client';
import type { Sesion } from '../auth/useSesion';

/**
 * Wrapper directo sobre `synchronize()` de WatermelonDB contra GET/POST
 * /sync — el backend (apps/backend/src/sync/sync.core.ts) ya está diseñado
 * para este contrato exacto, no hay lógica de diffing propia acá.
 */
export async function sincronizar(sesion: Sesion): Promise<void> {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const { changes, timestamp } = await api.pull(sesion, lastPulledAt ?? null);
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      await api.push(sesion, changes, lastPulledAt ?? null);
    },
  });
}
