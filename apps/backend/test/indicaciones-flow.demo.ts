/**
 * Flujo de trabajo: indicaciones/prescripciones (Fase B, §3.2 y §3.3 del spec
 * UI/UX) — cubre tanto el "documento de indicaciones" puntual como un
 * esquema de tratamiento continuo, y la discriminación de origen del insumo
 * (stock interno vs. receta externa). Misma lógica que IndicacionesService,
 * contra Postgres real (PGlite).
 *
 * Correr:  pnpm --filter backend test:indicaciones-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { organizaciones, especies, animales } from '../src/database/schema/core';
import { consultas, indicaciones } from '../src/database/schema/hce';
import { productos } from '../src/database/schema/farmacia';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA hce;
    CREATE SCHEMA farmacia;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TYPE hce.origen_indicacion AS ENUM ('stock_interno','receta_externa');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid,
      especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo',
      datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE hce.consultas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id),
      veterinario_id uuid,
      fecha timestamptz NOT NULL DEFAULT now(),
      motivo text, anamnesis text, examen_fisico text, diagnostico text, tratamiento text,
      peso_kg numeric(6,2), temperatura_c numeric(4,1), observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE farmacia.productos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, presentacion text, unidad text, categoria text, activo boolean NOT NULL DEFAULT true,
      concentracion numeric(10,3), unidad_concentracion text, dosis_sugerida_mg_kg numeric(10,3), precio numeric(12,2),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE hce.indicaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      consulta_id uuid NOT NULL REFERENCES hce.consultas(id),
      animal_id uuid NOT NULL REFERENCES core.animales(id),
      origen hce.origen_indicacion NOT NULL,
      producto_id uuid REFERENCES farmacia.productos(id), producto_nombre text,
      dosis text, cantidad_stock integer, frecuencia text, duracion_dias integer,
      observaciones text, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
  `);

  const db = drizzle(client, { schema: { organizaciones, especies, animales, consultas, productos, indicaciones } });
  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
  const [firulais] = await db.insert(animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais' }).returning();
  const [consulta] = await db.insert(consultas).values({ organizacionId: orgA.id, animalId: firulais.id, pesoKg: '10.0' }).returning();
  const [amoxi] = await db.insert(productos).values({
    organizacionId: orgA.id, nombre: 'Amoxicilina', concentracion: '50', unidadConcentracion: 'mg/ml', dosisSugeridaMgKg: '10',
  }).returning();

  // ---- Lógica replicada de IndicacionesService ----
  async function animalDeConsulta(orgId: string, consultaId: string) {
    const [c] = await db.select({ animalId: consultas.animalId }).from(consultas)
      .where(and(eq(consultas.id, consultaId), eq(consultas.organizacionId, orgId))).limit(1);
    if (!c) throw new Error('La consulta no existe en esta organización');
    return c.animalId;
  }
  async function crear(orgId: string, dto: any) {
    const animalId = await animalDeConsulta(orgId, dto.consultaId);
    if (dto.origen === 'stock_interno') {
      const [p] = await db.select({ id: productos.id }).from(productos)
        .where(and(eq(productos.id, dto.productoId), eq(productos.organizacionId, orgId))).limit(1);
      if (!p) throw new Error('El producto no existe en esta organización');
    }
    const [ind] = await db.insert(indicaciones).values({
      organizacionId: orgId, consultaId: dto.consultaId, animalId, origen: dto.origen,
      productoId: dto.origen === 'stock_interno' ? dto.productoId : undefined,
      productoNombre: dto.origen === 'receta_externa' ? dto.productoNombre : undefined,
      dosis: dto.dosis, cantidadStock: dto.origen === 'stock_interno' ? dto.cantidadStock : undefined,
      frecuencia: dto.frecuencia, duracionDias: dto.duracionDias, observaciones: dto.observaciones,
    }).returning();
    return ind;
  }
  async function listarPorAnimal(orgId: string, animalId: string) {
    return db.select().from(indicaciones)
      .where(and(eq(indicaciones.organizacionId, orgId), eq(indicaciones.animalId, animalId), isNull(indicaciones.deletedAt)))
      .orderBy(desc(indicaciones.createdAt));
  }

  // ============================== Pruebas ==============================
  console.log('1) Indicación puntual con stock interno (documento de indicaciones)');
  const i1 = await crear(orgA.id, {
    consultaId: consulta.id, origen: 'stock_interno', productoId: amoxi.id,
    dosis: '100mg', cantidadStock: 10, frecuencia: 'cada 12hs',
  });
  check('se creó', !!i1.id);
  check('animalId se derivó de la consulta (no del cliente)', i1.animalId === firulais.id);
  check('sin duración = indicación puntual', i1.duracionDias === null);
  check('activo por defecto', i1.activo === true);

  console.log('2) Esquema de tratamiento continuo con receta externa (no toca stock)');
  const i2 = await crear(orgA.id, {
    consultaId: consulta.id, origen: 'receta_externa', productoNombre: 'Meloxicam (traído por el tutor)',
    dosis: '1 comprimido', frecuencia: 'cada 24hs', duracionDias: 5,
  });
  check('se creó sin productoId', i2.productoId === null);
  check('guardó el nombre libre', i2.productoNombre === 'Meloxicam (traído por el tutor)');
  check('con duración = esquema continuo', i2.duracionDias === 5);
  check('sin cantidadStock (no es stock interno)', i2.cantidadStock === null);

  console.log('3) Stock interno con producto de otra organización se rechaza');
  const [otroProducto] = await db.insert(productos).values({ organizacionId: orgB.id, nombre: 'Ajeno' }).returning();
  let rechazoProducto = false;
  try { await crear(orgA.id, { consultaId: consulta.id, origen: 'stock_interno', productoId: otroProducto.id, cantidadStock: 1 }); }
  catch { rechazoProducto = true; }
  check('rechaza producto que no pertenece a la organización', rechazoProducto);

  console.log('4) Consulta de otra organización se rechaza');
  let rechazoConsulta = false;
  try { await crear(orgB.id, { consultaId: consulta.id, origen: 'receta_externa', productoNombre: 'X' }); }
  catch { rechazoConsulta = true; }
  check('rechaza consulta ajena', rechazoConsulta);

  console.log('5) Listado por animal trae ambas, más reciente primero');
  const lista = await listarPorAnimal(orgA.id, firulais.id);
  check('trae las 2 indicaciones', lista.length === 2);
  check('la más reciente (esquema) aparece primera', lista[0].id === i2.id);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
