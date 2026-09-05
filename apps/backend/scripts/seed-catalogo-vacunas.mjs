/**
 * Siembra el catálogo de referencia `hce.catalogo_vacunas` desde
 * `data/catalogo-vacunas.json` — global, no por organización, mismo
 * espíritu que `seed-especies.mjs`/`seed-vademecum-senasa.mjs`. Idempotente
 * por conteo de filas.
 *
 * El JSON trae la especie como nombre libre ("Bovino", "Canino", ...) — se
 * mapea a `core.especies.codigo` acá mismo; si el seed de especies no corrió
 * antes, no hay especie para vincular y esas filas se omiten con un aviso.
 *
 * Uso:
 *   node scripts/seed-catalogo-vacunas.mjs
 *   DATABASE_DRIVER=node-postgres DATABASE_URL=postgresql://... node scripts/seed-catalogo-vacunas.mjs
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'catalogo-vacunas.json');

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
export async function sembrarCatalogoVacunas(query) {
  const { rows } = await query('SELECT count(*)::int AS n FROM hce.catalogo_vacunas', []);
  if (Number(rows[0].n) > 0) {
    console.log('hce.catalogo_vacunas ya tiene datos — no se reimporta.');
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
      console.warn(`Especie sin mapear: "${item.especie}" (id_aplicacion ${item.id_aplicacion}) — se omite.`);
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
  await query(`INSERT INTO hce.catalogo_vacunas (especie_id, categoria, nombre) VALUES ${placeholders.join(',')}`, params);
  console.log(`✓ ${n} items del catálogo de vacunas importados`);
}

async function main() {
  const driver = process.env.DATABASE_DRIVER ?? 'pglite';

  if (driver === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = process.env.DATABASE_PATH || './pgdata';
    const client = new PGlite(dataDir);
    console.log(`Sembrando catálogo de vacunas en PGlite: ${dataDir}`);
    await sembrarCatalogoVacunas((sql, params) => client.query(sql, params));
    await client.close();
  } else {
    if (!process.env.DATABASE_URL) {
      console.error('Falta DATABASE_URL (requerido para DATABASE_DRIVER=node-postgres).');
      process.exit(1);
    }
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log('Sembrando catálogo de vacunas en Postgres real…');
    await sembrarCatalogoVacunas((sql, params) => client.query(sql, params));
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error('FALLÓ el seed del catálogo de vacunas:', e);
    process.exit(1);
  });
}
