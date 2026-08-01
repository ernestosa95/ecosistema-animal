/**
 * Inicializa una base local PGlite para desarrollo (sin instalar Postgres):
 *  - si la base ya está inicializada, no hace nada (idempotente)
 *  - si no, aplica la última migración de db/migrations y siembra especies
 *
 * Uso:  node scripts/init-local-db.mjs
 * Para empezar de cero: borrá la carpeta ./pgdata antes de correrlo.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../../../db/migrations');
const dataDir = process.env.DATABASE_PATH || './pgdata';

const client = new PGlite(dataDir);
console.log(`Base local en: ${dataDir}`);

// ¿Ya está inicializada? (existe el schema core)
const chk = await client.query(
  "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core'",
);
if (chk.rows.length > 0) {
  console.log('La base ya estaba inicializada. Nada que hacer.');
  console.log('(Si querés empezar de cero, borrá la carpeta ./pgdata y volvé a correr.)');
  await client.close();
  process.exit(0);
}

const sqlFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
if (!sqlFiles.length) {
  console.error('No hay migraciones en db/migrations. Corré primero: npm run db:generate');
  await client.close();
  process.exit(1);
}

for (const file of sqlFiles) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  await client.exec(sql);
  console.log(`  ✓ aplicada migración ${file}`);
}

await client.exec(`
  INSERT INTO core.especies (codigo, nombre) VALUES
    ('CAN','Canino'),('FEL','Felino'),('BOV','Bovino'),
    ('EQU','Equino'),('AVE','Ave'),('POR','Porcino'),
    ('OVI','Ovino'),('CAP','Caprino')
  ON CONFLICT (codigo) DO NOTHING;
`);
console.log('  ✓ especies base sembradas');

await client.close();
console.log('Base local lista.');