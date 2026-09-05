/**
 * Siembra el catálogo de referencia `hce.catalogo_diagnosticos` desde
 * `data/catalogo-diagnosticos.json` — mismo criterio exacto que
 * `seed-catalogo-vacunas.mjs` (global, idempotente por conteo de filas,
 * especie mapeada por nombre → `core.especies.codigo`).
 *
 * Uso:
 *   node scripts/seed-catalogo-diagnosticos.mjs
 *   DATABASE_DRIVER=node-postgres DATABASE_URL=postgresql://... node scripts/seed-catalogo-diagnosticos.mjs
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'catalogo-diagnosticos.json');

const CODIGO_POR_ESPECIE = {
  Bovino: 'BOV',
  Canino: 'CAN',
  Felino: 'FEL',
  Equino: 'EQU',
  Porcino: 'POR',
  Ovino: 'OVI',
  Caprino: 'CAP',
  Ave: 'AVE',
};

/** @param {(sql: string, params: unknown[]) => Promise<{ rows: any[] }>} query */
export async function sembrarCatalogoDiagnosticos(query) {
  const { rows } = await query('SELECT count(*)::int AS n FROM hce.catalogo_diagnosticos', []);
  if (Number(rows[0].n) > 0) {
    console.log('hce.catalogo_diagnosticos ya tiene datos — no se reimporta.');
    return;
  }

  const items = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  const { rows: especiesRows } = await query('SELECT id, codigo FROM core.especies', []);
  const idPorCodigo = new Map(especiesRows.map((e) => [e.codigo, e.id]));

  const params = [];
  const placeholders = [];
  let n = 0;
  for (const item of items) {
    const codigo = CODIGO_POR_ESPECIE[item.especie];
    const especieId = codigo ? idPorCodigo.get(codigo) : undefined;
    if (!especieId) {
      console.warn(`Especie sin mapear: "${item.especie}" (id_diagnostico ${item.id_diagnostico}) — se omite.`);
      continue;
    }
    const base = n * 3;
    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    params.push(especieId, item.categoria, item.nombre);
    n++;
  }

  if (n === 0) {
    console.log('Nada para importar (ninguna especie mapeó).');
    return;
  }
  await query(`INSERT INTO hce.catalogo_diagnosticos (especie_id, categoria, nombre) VALUES ${placeholders.join(',')}`, params);
  console.log(`✓ ${n} items del catálogo de diagnósticos importados`);
}

async function main() {
  const driver = process.env.DATABASE_DRIVER ?? 'pglite';

  if (driver === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = process.env.DATABASE_PATH || './pgdata';
    const client = new PGlite(dataDir);
    console.log(`Sembrando catálogo de diagnósticos en PGlite: ${dataDir}`);
    await sembrarCatalogoDiagnosticos((sql, params) => client.query(sql, params));
    await client.close();
  } else {
    if (!process.env.DATABASE_URL) {
      console.error('Falta DATABASE_URL (requerido para DATABASE_DRIVER=node-postgres).');
      process.exit(1);
    }
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log('Sembrando catálogo de diagnósticos en Postgres real…');
    await sembrarCatalogoDiagnosticos((sql, params) => client.query(sql, params));
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error('FALLÓ el seed del catálogo de diagnósticos:', e);
    process.exit(1);
  });
}
