import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import * as schema from './schema';

/** Token de inyección para acceder a la instancia de Drizzle. */
export const DRIZZLE = Symbol('DRIZZLE');

/** Tipo de la base tipada con todo el schema del ecosistema. */
export type DrizzleDB = NodePgDatabase<typeof schema>;

/**
 * Provider de la base. Elige el driver según DATABASE_DRIVER:
 *  - 'node-postgres' (default): Postgres real (producción / VM).
 *  - 'pglite': Postgres embebido en proceso (desarrollo local sin instalar nada).
 */
export const drizzleProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<DrizzleDB> => {
    const driver = config.get<string>('databaseDriver') ?? 'node-postgres';

    if (driver === 'pglite') {
      const { PGlite } = await import('@electric-sql/pglite');
      const { drizzle } = await import('drizzle-orm/pglite');
      const path = config.get<string>('databasePath'); // dir o undefined (memoria)
      const client = new PGlite(path);
      return drizzle(client, { schema }) as unknown as DrizzleDB;
    }

    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const pool = new Pool({ connectionString: config.get<string>('databaseUrl') });
    return drizzle(pool, { schema });
  },
};
