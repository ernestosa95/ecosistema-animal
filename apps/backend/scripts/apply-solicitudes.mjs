/**
 * Aplica la tabla core.solicitudes a la base local PGlite existente,
 * SIN borrar tus datos. Es idempotente (usa CREATE TABLE IF NOT EXISTS).
 *
 * Uso:  node scripts/apply-solicitudes.mjs
 * Requiere en .env: DATABASE_PATH=./pgdata (o el que uses)
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATABASE_PATH || './pgdata';
const sqlPath = join(__dirname, '../../../db/migrations/0001_solicitudes.sql');

const sql = readFileSync(sqlPath, 'utf8');
const db = new PGlite(dataDir);
console.log(`Base local en: ${dataDir}`);
await db.exec(sql);
console.log('  ✓ tabla core.solicitudes aplicada');
await db.close();
console.log('Listo.');
