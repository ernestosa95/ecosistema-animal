/**
 * Núcleo del motor de sincronización (puro, testeable sin Nest).
 * Contrato compatible con WatermelonDB `synchronize()`:
 *   pull  -> { changes, timestamp }
 *   push  -> aplica { [tabla]: { created, updated, deleted } }
 *
 * Reglas:
 *  - Multi-tenant: TODO se filtra/forza por organizacionId.
 *  - Conflictos: última escritura gana (por updated_at; el push pisa con now()).
 *  - Ids: UUID generados en el cliente (se respetan en el insert).
 *  - Soft delete: se comunican por el array `deleted` (ids); en la base se setea deleted_at.
 */
import { and, eq, gt, isNull, getTableColumns } from 'drizzle-orm';
import { personas, animales } from '../database/schema/core';
import { consultas, vacunaciones, turnos } from '../database/schema/hce';
import {
  establecimientos, existencias, movimientos, eventos,
  animalesCampo, potreros, hallazgos, torosVirtuales, muestras,
  plantillasTareas, protocolosIatf, tareas,
} from '../database/schema/tropera';
import { productos, stock, movimientosStock } from '../database/schema/farmacia';
import { aplicarMovimiento } from '../tropera/movimientos/aplicar-movimiento';
import { aplicarMovimientoStock } from '../farmacia/movimientos/aplicar-movimiento-stock';
import { generarProximoCodigoLegible } from '../core/animales/generar-proximo-codigo-legible';

export interface TablaSync {
  name: string; // nombre de tabla en WatermelonDB (= nombre SQL)
  table: any;   // tabla Drizzle
  // Se corre dentro de la misma transacción del push, sólo para filas que
  // realmente se insertaron (no para reintentos absorbidos por
  // onConflictDoNothing). Usado por `movimientos` para aplicar el mismo
  // ajuste de `existencias` que corre en el alta online.
  afterCreate?: (tx: any, orgId: string, row: any) => Promise<void>;
}

// Orden = dependencias primero (importa para los inserts del push).
export const REGISTRY: TablaSync[] = [
  { name: 'personas', table: personas },
  {
    name: 'animales',
    table: animales,
    // El código legible depende de nextval('core.animales_codigo_seq') —
    // no se puede generar en el cliente. El alta offline llega sin él
    // (columna nullable); acá se le asigna, igual que hace
    // AnimalesService.crear() en el alta online.
    afterCreate: async (tx, _orgId, row) => {
      if (row.codigoLegible) return;
      const codigoLegible = await generarProximoCodigoLegible(tx, row.especieId);
      // Bump defensivo de updatedAt: no hace falta para que ESTA fila entre
      // en el próximo pull delta (su updatedAt de insert, tomado dentro de
      // este mismo push, ya es posterior al lastPulledAt de la ronda — a
      // diferencia de `ajustar()` en tropera/movimientos, que sí actualiza
      // filas de `existencias` preexistentes de rondas anteriores), pero
      // mantiene la invariante de que updatedAt siempre refleja la última
      // escritura real de la fila.
      await tx.update(animales).set({ codigoLegible, updatedAt: new Date() }).where(eq(animales.id, row.id));
    },
  },
  { name: 'consultas', table: consultas },
  { name: 'vacunaciones', table: vacunaciones },
  { name: 'turnos', table: turnos },
  // Farmacia (2026-09-02): antes deliberadamente fuera del registry
  // ("desk/online por diseño", ver nota vieja en apps/mobile/src/db/schema.ts)
  // — se suma ahora para el flujo de Venta rápida offline del mobile.
  // Orden: después de `consultas` (movimientos_stock.consultaId es FK
  // opcional), `productos` antes de `movimientos_stock` (depende de él).
  { name: 'productos', table: productos },
  { name: 'stock', table: stock },
  {
    name: 'movimientos_stock',
    table: movimientosStock,
    afterCreate: (tx, orgId, row) => aplicarMovimientoStock(tx, orgId, row),
  },
  { name: 'establecimientos', table: establecimientos },
  { name: 'existencias', table: existencias },
  {
    name: 'movimientos',
    table: movimientos,
    afterCreate: (tx, orgId, row) => aplicarMovimiento(tx, orgId, row),
  },
  // Fase E (seguimiento individual): sólo las tablas que ya tienen
  // updated_at/deleted_at, que es lo que el motor genérico de pull/push
  // asume en toda tabla registrada. `plantilla_items`, `protocolo_iatf_pasos`
  // y `evaluaciones_andrologicas` quedan afuera a propósito — son filas
  // hijas inmutables sin esas columnas; sumarlas requiere antes esa
  // migración de schema, una decisión aparte de "cablear el registry".
  // Orden importante: `potreros` antes de `animales_campo` (potrero_id),
  // `animales_campo`/`hallazgos`/`toros_virtuales` antes de `eventos` (los
  // tres son FKs opcionales de eventos), `animales_campo`/`protocolos_iatf`
  // antes de `tareas` — todo dentro de la misma transacción de push, así
  // que una fila creada offline en la misma ronda que la referencia debe
  // insertarse antes.
  { name: 'potreros', table: potreros },
  { name: 'animales_campo', table: animalesCampo },
  { name: 'hallazgos', table: hallazgos },
  { name: 'toros_virtuales', table: torosVirtuales },
  { name: 'muestras', table: muestras },
  { name: 'plantillas_tareas', table: plantillasTareas },
  { name: 'protocolos_iatf', table: protocolosIatf },
  { name: 'tareas', table: tareas },
  { name: 'eventos', table: eventos },
];

// Columnas que el cliente NO puede escribir (las gobierna el server).
const NO_ESCRIBIBLES = new Set(['id', 'organizacion_id', 'created_at', 'updated_at', 'deleted_at']);
// Columnas que NO se envían en created/updated (deleted_at se comunica por `deleted`).
const FUERA_DE_PAYLOAD = new Set(['deleted_at']);

type Registro = Record<string, any>;

/** Fila de la base -> objeto para WatermelonDB (claves snake_case = columnas SQL). */
function serializeRow(table: any, row: any): Registro {
  const cols = getTableColumns(table);
  const out: Registro = {};
  for (const [key, col] of Object.entries<any>(cols)) {
    const name = col.name;
    if (FUERA_DE_PAYLOAD.has(name)) continue;
    const v = row[key];
    if (v === null || v === undefined) { out[name] = null; continue; }
    switch (col.columnType) {
      case 'PgTimestamp': out[name] = v instanceof Date ? v.getTime() : new Date(v).getTime(); break; // ms
      case 'PgNumeric':   out[name] = typeof v === 'string' ? Number(v) : v; break;
      case 'PgJsonb':     out[name] = typeof v === 'string' ? v : JSON.stringify(v); break; // string en el cliente
      default:            out[name] = v; // text, uuid, boolean, date('YYYY-MM-DD'), enum
    }
  }
  return out;
}

/** Objeto de WatermelonDB -> valores para insert/update Drizzle (sólo columnas escribibles). */
function valoresParaEscribir(table: any, rec: Registro): Registro {
  const cols = getTableColumns(table);
  const out: Registro = {};
  for (const [key, col] of Object.entries<any>(cols)) {
    const name = col.name;
    if (NO_ESCRIBIBLES.has(name)) continue;
    if (!(name in rec)) continue;
    const v = rec[name];
    if (v === null || v === undefined) { out[key] = null; continue; }
    switch (col.columnType) {
      case 'PgTimestamp': out[key] = new Date(typeof v === 'number' ? v : Date.parse(v)); break;
      case 'PgNumeric':   out[key] = String(v); break;
      case 'PgJsonb':     out[key] = typeof v === 'string' ? JSON.parse(v) : v; break;
      case 'PgBoolean':   out[key] = !!v; break;
      default:            out[key] = v;
    }
  }
  return out;
}

/** PULL: cambios desde `lastPulledAt` (ms). Sin él = primera sync (todo lo vigente como created). */
export async function pull(db: any, orgId: string, lastPulledAt?: number) {
  const timestamp = Date.now();
  const since = lastPulledAt && lastPulledAt > 0 ? new Date(lastPulledAt) : null;
  const changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }> = {};

  for (const t of REGISTRY) {
    const created: any[] = [];
    const updated: any[] = [];
    const deleted: string[] = [];

    if (!since) {
      const rows = await db.select().from(t.table)
        .where(and(eq(t.table.organizacionId, orgId), isNull(t.table.deletedAt)));
      for (const r of rows) created.push(serializeRow(t.table, r));
    } else {
      const rows = await db.select().from(t.table)
        .where(and(eq(t.table.organizacionId, orgId), gt(t.table.updatedAt, since)));
      for (const r of rows) {
        if (r.deletedAt) deleted.push(r.id);
        else if (r.createdAt > since) created.push(serializeRow(t.table, r));
        else updated.push(serializeRow(t.table, r));
      }
    }
    changes[t.name] = { created, updated, deleted };
  }

  return { changes, timestamp };
}

/** PUSH: aplica los cambios del cliente. Todo forzado a `orgId`. */
export async function push(db: any, orgId: string, changes: Record<string, any>) {
  await db.transaction(async (tx: any) => {
    // Creaciones y actualizaciones (padres primero).
    for (const t of REGISTRY) {
      const c = changes?.[t.name];
      if (!c) continue;
      for (const rec of c.created ?? []) {
        const values = valoresParaEscribir(t.table, rec);
        const inserted = await tx.insert(t.table)
          .values({ ...values, id: rec.id, organizacionId: orgId })
          .onConflictDoNothing() // idempotente ante reintentos
          .returning();
        if (t.afterCreate && inserted.length > 0) {
          await t.afterCreate(tx, orgId, inserted[0]);
        }
      }
      for (const rec of c.updated ?? []) {
        const values = valoresParaEscribir(t.table, rec);
        await tx.update(t.table)
          .set({ ...values, updatedAt: new Date() })
          .where(and(eq(t.table.id, rec.id), eq(t.table.organizacionId, orgId)));
      }
    }
    // Borrados (soft delete). Bump de updated_at para que el pull los capture.
    for (const t of REGISTRY) {
      const c = changes?.[t.name];
      if (!c) continue;
      for (const id of c.deleted ?? []) {
        await tx.update(t.table)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(t.table.id, id), eq(t.table.organizacionId, orgId)));
      }
    }
  });
}
