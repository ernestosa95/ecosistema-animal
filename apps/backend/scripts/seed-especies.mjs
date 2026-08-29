/**
 * Siembra las especies base (`core.especies`). Idempotente — se puede correr
 * las veces que haga falta (ON CONFLICT DO NOTHING).
 *
 * Funciona contra cualquiera de los dos drivers, igual criterio que
 * database/drizzle.provider.ts:
 *   - DATABASE_DRIVER=pglite (default)  → usa DATABASE_PATH (o memoria si no está)
 *   - DATABASE_DRIVER=node-postgres     → usa DATABASE_URL
 *
 * Uso:
 *   node scripts/seed-especies.mjs                        # dev, PGlite (via init-local-db.mjs)
 *   DATABASE_DRIVER=node-postgres DATABASE_URL=postgresql://... node scripts/seed-especies.mjs
 *
 * `drizzle-kit migrate` (el camino de producción) NO siembra nada — este
 * script es el paso que falta correr después de migrar contra un Postgres real.
 */
import { fileURLToPath } from 'node:url';

export const ESPECIES_SQL = `
  INSERT INTO core.especies (codigo, nombre) VALUES
    ('CAN','Canino'),('FEL','Felino'),('BOV','Bovino'),
    ('EQU','Equino'),('AVE','Ave'),('POR','Porcino'),
    ('OVI','Ovino'),('CAP','Caprino')
  ON CONFLICT (codigo) DO NOTHING;
`;

/** @param {(sql: string) => Promise<unknown>} ejecutarSql */
export async function sembrarEspecies(ejecutarSql) {
  await ejecutarSql(ESPECIES_SQL);
}

async function main() {
  const driver = process.env.DATABASE_DRIVER ?? 'pglite';

  if (driver === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = process.env.DATABASE_PATH || './pgdata';
    const client = new PGlite(dataDir);
    console.log(`Sembrando especies en PGlite: ${dataDir}`);
    await sembrarEspecies((sql) => client.exec(sql));
    await client.close();
  } else {
    if (!process.env.DATABASE_URL) {
      console.error('Falta DATABASE_URL (requerido para DATABASE_DRIVER=node-postgres).');
      process.exit(1);
    }
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log('Sembrando especies en Postgres real…');
    await sembrarEspecies((sql) => client.query(sql));
    await client.end();
  }

  console.log('✓ especies base sembradas (o ya existían)');
}

// Sólo correr main() si se invoca directamente (no cuando init-local-db.mjs lo
// importa). Comparado como paths de archivo, no como URLs — si el repo vive
// bajo una ruta con espacios u otros caracteres especiales, `import.meta.url`
// los codifica (%20) pero `process.argv[1]` no, así que compararlos como
// string nunca da true.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error('FALLÓ el seed de especies:', e);
    process.exit(1);
  });
}
