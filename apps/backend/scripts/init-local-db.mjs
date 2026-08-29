/**
 * Inicializa una base local PGlite para desarrollo (sin instalar Postgres):
 *  - aplica la última migración de db/migrations
 *  - siembra especies base
 *
 * Uso:  node scripts/init-local-db.mjs
 * Requiere en .env: DATABASE_DRIVER=pglite y DATABASE_PATH=./pgdata
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sembrarEspecies } from './seed-especies.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../../../db/migrations');
const dataDir = process.env.DATABASE_PATH || './pgdata';

const sqlFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
if (!sqlFiles.length) {
  console.error('No hay migraciones en db/migrations. Corré primero: npm run db:generate');
  process.exit(1);
}

const client = new PGlite(dataDir);
console.log(`Base local en: ${dataDir}`);

for (const file of sqlFiles) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  await client.exec(sql);
  console.log(`  ✓ aplicada migración ${file}`);
}

// Seeds mínimos: especies base (compartido con seed-especies.mjs, que es el
// que hay que correr a mano después de `db:migrate` contra un Postgres real).
await sembrarEspecies((sql) => client.exec(sql));
console.log('  ✓ especies base sembradas');

await client.close();
console.log('Base local lista.');
