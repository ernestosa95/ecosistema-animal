/**
 * Flujo de trabajo: catálogo de macros de texto (Fase B, §3.1 del spec
 * UI/UX). Misma lógica que MacrosService, contra Postgres real (PGlite).
 *
 * Correr:  pnpm --filter backend test:macros-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq, isNull } from 'drizzle-orm';
import { organizaciones } from '../src/database/schema/core';
import { macros } from '../src/database/schema/hce';
import { MACROS_DEFAULT } from '../src/hce/macros/macros-default';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA hce;
    CREATE TYPE hce.categoria_macro AS ENUM ('anamnesis','examenFisico','diagnostico','tratamiento');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false, logo_url text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE hce.macros (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      categoria hce.categoria_macro NOT NULL, tag text NOT NULL, texto text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
  `);

  const db = drizzle(client, { schema: { organizaciones, macros } });
  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();

  // ---- Lógica replicada de MacrosService ----
  async function listar(orgId: string, categoria?: string): Promise<any[]> {
    const propias = await db.select().from(macros)
      .where(and(eq(macros.organizacionId, orgId), isNull(macros.deletedAt)));
    if (propias.length === 0) {
      await db.insert(macros).values(
        MACROS_DEFAULT.map((m) => ({ organizacionId: orgId, categoria: m.categoria, tag: m.tag, texto: m.texto })),
      );
      return listar(orgId, categoria);
    }
    return categoria ? propias.filter((m) => m.categoria === categoria) : propias;
  }

  // ============================== Pruebas ==============================
  console.log('1) Siembra lazy del catálogo default');
  const primeraVez = await listar(orgA.id);
  check(`se sembraron las ${MACROS_DEFAULT.length} macros default`, primeraVez.length === MACROS_DEFAULT.length);

  console.log('2) La siembra es idempotente (no duplica en un segundo pedido)');
  const segundaVez = await listar(orgA.id);
  check('sigue habiendo la misma cantidad', segundaVez.length === MACROS_DEFAULT.length);

  console.log('3) Filtro por categoría');
  const soloAnamnesis = await listar(orgA.id, 'anamnesis');
  check('todas son de la categoría pedida', soloAnamnesis.every((m) => m.categoria === 'anamnesis'));
  check('hay al menos una', soloAnamnesis.length > 0);

  console.log('4) Cada organización arranca de la misma base pero son filas propias');
  const deB = await listar(orgB.id);
  check('orgB también tiene el catálogo default', deB.length === MACROS_DEFAULT.length);
  await db.update(macros).set({ texto: 'Editado por orgA' })
    .where(and(eq(macros.organizacionId, orgA.id), eq(macros.tag, deB[0].tag)));
  const [tocada] = await db.select().from(macros)
    .where(and(eq(macros.organizacionId, orgB.id), eq(macros.tag, deB[0].tag)));
  check('editar la de orgA no afecta la de orgB (filas independientes)', tocada.texto !== 'Editado por orgA');

  console.log('5) Borrado no cuenta para el filtro por categoría');
  const [aBorrar] = soloAnamnesis;
  await db.update(macros).set({ deletedAt: new Date() }).where(eq(macros.id, aBorrar.id));
  const trasBorrar = await listar(orgA.id, 'anamnesis');
  check('la macro borrada ya no aparece', !trasBorrar.some((m) => m.id === aBorrar.id));

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
