/**
 * Siembra el catálogo de referencia `farmacia.vademecum_senasa` desde
 * `data/vademecum_senasa.csv` (export del registro nacional de SENASA,
 * F4.1) — global, no por organización, mismo espíritu que
 * `seed-especies.mjs`. Idempotente por conteo de filas (no hay unique
 * constraint sobre `certificado`: el registro real trae ~245 números
 * repetidos, así que un `ON CONFLICT` no aplica acá) — si la tabla ya tiene
 * datos, no vuelve a insertar.
 *
 * Uso:
 *   node scripts/seed-vademecum-senasa.mjs
 *   DATABASE_DRIVER=node-postgres DATABASE_URL=postgresql://... node scripts/seed-vademecum-senasa.mjs
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CSV_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'vademecum_senasa.csv');
const LOTE = 500;

function parseCsv(texto) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lineas
    .slice(1) // saltar encabezado
    .map((linea) => linea.split(';').map((campo) => campo.trim().replace(/^"|"$/g, '')))
    .filter(([certificado, nombreComercial]) => certificado && nombreComercial)
    .map(([certificado, nombreComercial, empresa]) => ({ certificado, nombreComercial, empresa: empresa || null }));
}

/** @param {(sql: string, params: unknown[]) => Promise<{ rows: any[] }>} query */
export async function sembrarVademecumSenasa(query) {
  const { rows } = await query('SELECT count(*)::int AS n FROM farmacia.vademecum_senasa', []);
  if (Number(rows[0].n) > 0) {
    console.log('farmacia.vademecum_senasa ya tiene datos — no se reimporta.');
    return;
  }

  const filas = parseCsv(readFileSync(CSV_PATH, 'utf-8'));
  for (let i = 0; i < filas.length; i += LOTE) {
    const lote = filas.slice(i, i + LOTE);
    const placeholders = [];
    const params = [];
    lote.forEach((f, idx) => {
      const base = idx * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      params.push(f.certificado, f.nombreComercial, f.empresa);
    });
    await query(
      `INSERT INTO farmacia.vademecum_senasa (certificado, nombre_comercial, empresa) VALUES ${placeholders.join(',')}`,
      params,
    );
  }
  console.log(`✓ ${filas.length} productos del vademécum SENASA importados`);
}

async function main() {
  const driver = process.env.DATABASE_DRIVER ?? 'pglite';

  if (driver === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = process.env.DATABASE_PATH || './pgdata';
    const client = new PGlite(dataDir);
    console.log(`Sembrando vademécum SENASA en PGlite: ${dataDir}`);
    await sembrarVademecumSenasa((sql, params) => client.query(sql, params));
    await client.close();
  } else {
    if (!process.env.DATABASE_URL) {
      console.error('Falta DATABASE_URL (requerido para DATABASE_DRIVER=node-postgres).');
      process.exit(1);
    }
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log('Sembrando vademécum SENASA en Postgres real…');
    await sembrarVademecumSenasa((sql, params) => client.query(sql, params));
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error('FALLÓ el seed del vademécum SENASA:', e);
    process.exit(1);
  });
}
