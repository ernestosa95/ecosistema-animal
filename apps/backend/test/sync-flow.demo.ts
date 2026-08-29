/**
 * Prueba del motor de sincronización contra un Postgres real (PGlite/WASM),
 * usando los schemas core/hce reales y las funciones puras de src/sync/sync.core.
 *
 * Correr:  pnpm --filter backend test:sync-demo   (o: npx tsx test/sync-flow.demo.ts)
 * No requiere Postgres instalado.
 *
 * Cubre: primera sync (vacía) -> push de creaciones -> pull delta -> update -> delete,
 * y verifica el aislamiento por organización.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as core from '../src/database/schema/core';
import * as hce from '../src/database/schema/hce';
import * as tropera from '../src/database/schema/tropera';
import { pull, push } from '../src/sync/sync.core';
import { validarCodigoLegible } from '../src/core/animales/codigo-legible.util';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA hce;
    CREATE SEQUENCE core.animales_codigo_seq START 1;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_persona AS ENUM ('masculino','femenino','otro');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TYPE hce.estado_turno AS ENUM ('solicitado','confirmado','reprogramado','cancelado','atendido','ausente');

    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.personas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      usuario_id uuid REFERENCES core.usuarios(id),
      dni text, nombre text NOT NULL, apellido text NOT NULL, sexo core.sexo_persona,
      fecha_nacimiento date, celular text, telefono text, email text, domicilio text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.animales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid REFERENCES core.personas(id),
      especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo',
      datos_especificos jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.consultas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id), veterinario_id uuid REFERENCES core.usuarios(id),
      fecha timestamptz NOT NULL DEFAULT now(), motivo text, anamnesis text, examen_fisico text,
      diagnostico text, tratamiento text, peso_kg numeric(6,2), temperatura_c numeric(4,1), observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.vacunaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id), veterinario_id uuid REFERENCES core.usuarios(id),
      producto text, vademecum_id uuid, fecha date NOT NULL DEFAULT current_date, proxima_dosis date, lote_producto text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.turnos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid REFERENCES core.animales(id), persona_id uuid REFERENCES core.personas(id),
      veterinario_id uuid REFERENCES core.usuarios(id), fecha_hora timestamptz NOT NULL,
      estado hce.estado_turno NOT NULL DEFAULT 'solicitado', motivo text, canal text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);

    CREATE SCHEMA tropera;
    CREATE TYPE tropera.categoria_hacienda AS ENUM ('vaca','toro','ternero','ternera','vaquillona','novillo');
    CREATE TYPE tropera.tipo_movimiento AS ENUM ('nacimiento','compra','muerte','venta','traslado');
    CREATE TYPE tropera.tipo_evento AS ENUM ('vacunacion','desparasitacion','tratamiento','servicio','diagnostico_prenez','destete');
    CREATE TABLE tropera.establecimientos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, ubicacion text, superficie_ha numeric(10,2),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.existencias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      categoria tropera.categoria_hacienda NOT NULL, cantidad integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.movimientos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      tipo tropera.tipo_movimiento NOT NULL, categoria tropera.categoria_hacienda NOT NULL, cantidad integer NOT NULL,
      establecimiento_origen_id uuid REFERENCES tropera.establecimientos(id),
      establecimiento_destino_id uuid REFERENCES tropera.establecimientos(id),
      fecha date NOT NULL DEFAULT current_date, observaciones text, usuario_id uuid REFERENCES core.usuarios(id),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TYPE tropera.estado_animal_campo AS ENUM ('activo','vendido','muerto','transferido');
    CREATE TYPE tropera.estado_tarea AS ENUM ('pendiente','completada','cancelada');
    CREATE TABLE tropera.potreros (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      nombre text NOT NULL, superficie_ha numeric(10,2), capacidad_cabezas integer, observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.animales_campo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      caravana text NOT NULL, caravana_definitiva boolean NOT NULL DEFAULT true,
      categoria tropera.categoria_hacienda NOT NULL, potrero_id uuid REFERENCES tropera.potreros(id),
      sexo text, estado tropera.estado_animal_campo NOT NULL DEFAULT 'activo',
      fecha_alta date NOT NULL DEFAULT current_date, observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.hallazgos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.toros_virtuales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, raza text, proveedor text, observaciones text, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.muestras (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      animal_campo_id uuid REFERENCES tropera.animales_campo(id), caravana text, tubo_numero integer NOT NULL,
      tipo_muestra text, fecha date NOT NULL DEFAULT current_date, observaciones text, usuario_id uuid REFERENCES core.usuarios(id),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.plantillas_tareas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.protocolos_iatf (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, descripcion text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.tareas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      animal_campo_id uuid REFERENCES tropera.animales_campo(id), protocolo_id uuid REFERENCES tropera.protocolos_iatf(id),
      descripcion text NOT NULL, producto text, fecha_programada date NOT NULL,
      estado tropera.estado_tarea NOT NULL DEFAULT 'pendiente', observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE tropera.eventos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      tipo tropera.tipo_evento NOT NULL, categoria tropera.categoria_hacienda, cantidad integer, producto text,
      fecha date NOT NULL DEFAULT current_date, observaciones text, usuario_id uuid REFERENCES core.usuarios(id),
      animal_campo_id uuid REFERENCES tropera.animales_campo(id), retiro_hasta date,
      hallazgo_id uuid REFERENCES tropera.hallazgos(id), resultado_reproductivo text,
      toro_virtual_id uuid REFERENCES tropera.toros_virtuales(id),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { ...core, ...hce, ...tropera } });

  // Seed: dos organizaciones + una especie compartida.
  const [orgA] = await db.insert(core.organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(core.organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [esp] = await db.insert(core.especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();

  console.log('1) Primera sync (org A, vacía)');
  const p0 = await pull(db, orgA.id, 0);
  check('devuelve timestamp', typeof p0.timestamp === 'number' && p0.timestamp > 0);
  check('animales.created vacío', p0.changes.animales.created.length === 0);

  console.log('2) Push de creaciones (persona + animal) con UUIDs del cliente');
  const personaId = randomUUID();
  const animalId = randomUUID();
  await push(db, orgA.id, {
    personas: { created: [{ id: personaId, nombre: 'Renzo', apellido: 'Gardiol', dni: '30111222' }], updated: [], deleted: [] },
    animales: { created: [{ id: animalId, nombre: 'Duki', especie_id: esp.id, persona_id: personaId, estado: 'activo', datos_especificos: JSON.stringify({ raza: 'Mestizo' }) }], updated: [], deleted: [] },
  });
  const enBase = await db.select().from(core.animales).where(eq(core.animales.id, animalId));
  check('el animal quedó en la base', enBase.length === 1 && enBase[0].nombre === 'Duki');
  check('respetó el UUID del cliente', enBase[0].id === animalId);
  check('forzó la organización correcta', enBase[0].organizacionId === orgA.id);
  check('datos_especificos se guardó como JSON', (enBase[0].datosEspecificos as any)?.raza === 'Mestizo');

  console.log('3) Aislamiento multi-tenant: org B no ve nada de org A');
  const pB = await pull(db, orgB.id, 0);
  check('org B no ve el animal de org A', pB.changes.animales.created.length === 0);

  console.log('4) Pull delta (org A) trae lo nuevo');
  const p1 = await pull(db, orgA.id, 0);
  check('pull completo trae el animal como created', p1.changes.animales.created.some((a: any) => a.id === animalId));
  const desde = p0.timestamp;
  const p1b = await pull(db, orgA.id, desde);
  check('pull delta (desde t0) trae el animal', p1b.changes.animales.created.some((a: any) => a.id === animalId));
  check('el created_at viaja como número (ms)', typeof p1b.changes.animales.created[0].created_at === 'number');

  console.log('5) Update por push → aparece en updated del delta');
  await new Promise((r) => setTimeout(r, 5));
  const tAntesUpdate = Date.now();
  await new Promise((r) => setTimeout(r, 5));
  await push(db, orgA.id, { animales: { created: [], updated: [{ id: animalId, nombre: 'Duki (editado)', especie_id: esp.id }], deleted: [] } });
  const p2 = await pull(db, orgA.id, tAntesUpdate);
  check('el animal editado aparece en updated', p2.changes.animales.updated.some((a: any) => a.id === animalId && a.nombre === 'Duki (editado)'));
  check('no aparece en created (ya existía)', !p2.changes.animales.created.some((a: any) => a.id === animalId));

  console.log('6) Delete por push → aparece en deleted del delta');
  await new Promise((r) => setTimeout(r, 5));
  const tAntesDelete = Date.now();
  await new Promise((r) => setTimeout(r, 5));
  await push(db, orgA.id, { animales: { created: [], updated: [], deleted: [animalId] } });
  const p3 = await pull(db, orgA.id, tAntesDelete);
  check('el animal aparece en deleted (por id)', p3.changes.animales.deleted.includes(animalId));
  const p3full = await pull(db, orgA.id, 0);
  check('el pull completo ya no lo trae (soft-deleted)', !p3full.changes.animales.created.some((a: any) => a.id === animalId));

  console.log('7) Tropera: push de establecimiento + movimiento de compra ajusta existencias');
  const establecimientoId = randomUUID();
  await push(db, orgA.id, {
    establecimientos: { created: [{ id: establecimientoId, nombre: 'Campo Norte' }], updated: [], deleted: [] },
  });
  const movCompraId = randomUUID();
  await push(db, orgA.id, {
    movimientos: {
      created: [{
        id: movCompraId, tipo: 'compra', categoria: 'vaca', cantidad: 10,
        establecimiento_destino_id: establecimientoId, fecha: '2026-08-28',
      }],
      updated: [], deleted: [],
    },
  });
  const exDespuesCompra = await db.select().from(tropera.existencias)
    .where(eq(tropera.existencias.establecimientoId, establecimientoId));
  check('la compra creó la fila de existencias', exDespuesCompra.length === 1);
  check('existencias quedó en 10 tras la compra', exDespuesCompra[0]?.cantidad === 10);
  const movsEnBase = await db.select().from(tropera.movimientos).where(eq(tropera.movimientos.id, movCompraId));
  check('el movimiento de compra quedó insertado', movsEnBase.length === 1);

  console.log('8) Tropera: push de venta que dejaría stock negativo se rechaza (y no rompe el resto del lote)');
  const otroEstablecimientoId = randomUUID();
  let rechazado = false;
  try {
    await push(db, orgA.id, {
      establecimientos: { created: [{ id: otroEstablecimientoId, nombre: 'Campo Sur' }], updated: [], deleted: [] },
      movimientos: {
        created: [{
          id: randomUUID(), tipo: 'venta', categoria: 'vaca', cantidad: 999,
          establecimiento_origen_id: establecimientoId, fecha: '2026-08-28',
        }],
        updated: [], deleted: [],
      },
    });
  } catch {
    rechazado = true;
  }
  check('el push que dejaría stock negativo lanza y se rechaza', rechazado);
  const exSinCambios = await db.select().from(tropera.existencias)
    .where(eq(tropera.existencias.establecimientoId, establecimientoId));
  check('existencias no cambió tras el rechazo', exSinCambios[0]?.cantidad === 10);
  const establecimientosSur = await db.select().from(tropera.establecimientos)
    .where(eq(tropera.establecimientos.id, otroEstablecimientoId));
  check('el establecimiento del mismo lote tampoco quedó (rollback de toda la transacción)', establecimientosSur.length === 0);

  console.log('9) Tropera: reintentar el mismo push (mismo id de movimiento) no duplica el ajuste');
  await push(db, orgA.id, {
    movimientos: {
      created: [{
        id: movCompraId, tipo: 'compra', categoria: 'vaca', cantidad: 10,
        establecimiento_destino_id: establecimientoId, fecha: '2026-08-28',
      }],
      updated: [], deleted: [],
    },
  });
  const exTrasReintento = await db.select().from(tropera.existencias)
    .where(eq(tropera.existencias.establecimientoId, establecimientoId));
  check('el reintento (onConflictDoNothing) no volvió a sumar stock', exTrasReintento[0]?.cantidad === 10);

  console.log('10) Alta offline de un animal (sin codigo_legible) recibe uno al sincronizar');
  const animalOfflineId = randomUUID();
  const tAntesAltaOffline = Date.now();
  await new Promise((r) => setTimeout(r, 5));
  await push(db, orgA.id, {
    animales: {
      created: [{
        id: animalOfflineId, nombre: 'Firulais', especie_id: esp.id, estado: 'activo',
        datos_especificos: '{}',
      }],
      updated: [], deleted: [],
    },
  });
  const [animalOffline] = await db.select().from(core.animales).where(eq(core.animales.id, animalOfflineId));
  check('el animal offline quedó con codigo_legible asignado', !!animalOffline?.codigoLegible);
  check('el codigo_legible generado es válido (Luhn)', validarCodigoLegible(animalOffline?.codigoLegible ?? ''));

  console.log('11) El codigo_legible asignado por el hook aparece en el próximo pull delta (no sólo en un full resync)');
  const p4 = await pull(db, orgA.id, tAntesAltaOffline);
  const enCreated = p4.changes.animales.created.find((a: any) => a.id === animalOfflineId);
  check(
    'el pull delta trae el animal con su codigo_legible (updatedAt se bumpeó al asignarlo)',
    enCreated?.codigo_legible === animalOffline?.codigoLegible,
  );

  console.log('12) Fase E en un solo push: potrero + animal_campo + hallazgo + toro_virtual + evento que los referencia, todo en la misma ronda offline');
  const potreroId = randomUUID();
  const animalCampoId = randomUUID();
  const hallazgoId = randomUUID();
  const toroVirtualId = randomUUID();
  const eventoId = randomUUID();
  await push(db, orgA.id, {
    potreros: { created: [{ id: potreroId, establecimiento_id: establecimientoId, nombre: 'Potrero 3' }], updated: [], deleted: [] },
    animales_campo: {
      created: [{
        id: animalCampoId, establecimiento_id: establecimientoId, caravana: 'AR-001',
        caravana_definitiva: true, categoria: 'vaca', potrero_id: potreroId, estado: 'activo',
        fecha_alta: '2026-08-29',
      }], updated: [], deleted: [],
    },
    hallazgos: { created: [{ id: hallazgoId, nombre: 'Metritis' }], updated: [], deleted: [] },
    toros_virtuales: { created: [{ id: toroVirtualId, nombre: 'Toro Genético 1', activo: true }], updated: [], deleted: [] },
    eventos: {
      created: [{
        id: eventoId, establecimiento_id: establecimientoId, tipo: 'diagnostico_prenez',
        fecha: '2026-08-29', animal_campo_id: animalCampoId, hallazgo_id: hallazgoId,
        toro_virtual_id: toroVirtualId, resultado_reproductivo: 'prenada',
      }], updated: [], deleted: [],
    },
  });
  const [animalCampo] = await db.select().from(tropera.animalesCampo).where(eq(tropera.animalesCampo.id, animalCampoId));
  check('el animal_campo quedó con el potrero asignado (creado en el mismo push)', animalCampo?.potreroId === potreroId);
  const [eventoFaseE] = await db.select().from(tropera.eventos).where(eq(tropera.eventos.id, eventoId));
  check(
    'el evento quedó con las 3 FKs opcionales de Fase E resueltas (creadas en el mismo push)',
    eventoFaseE?.animalCampoId === animalCampoId && eventoFaseE?.hallazgoId === hallazgoId && eventoFaseE?.toroVirtualId === toroVirtualId,
  );
  const p5 = await pull(db, orgA.id, 0);
  check('el pull completo trae animales_campo/potreros/hallazgos/toros_virtuales', (
    p5.changes.animales_campo.created.length === 1 &&
    p5.changes.potreros.created.length === 1 &&
    p5.changes.hallazgos.created.length === 1 &&
    p5.changes.toros_virtuales.created.length === 1
  ));

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
