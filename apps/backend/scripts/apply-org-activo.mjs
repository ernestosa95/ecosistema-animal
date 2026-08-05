/**
 * Aplica la columna core.organizaciones.activo a la base local PGlite existente,
 * SIN borrar tus datos. Idempotente (ADD COLUMN IF NOT EXISTS).
 *
 * Uso:  node scripts/apply-org-activo.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATABASE_PATH || './pgdata';
const sqlPath = join(__dirname, '../../../db/migrations/0002_org_activo.sql');

const sql = readFileSync(sqlPath, 'utf8');
const db = new PGlite(dataDir);
console.log(`Base local en: ${dataDir}`);
await db.exec(sql);
console.log('  ✓ columna core.organizaciones.activo aplicada');
await db.close();
console.log('Listo.');
