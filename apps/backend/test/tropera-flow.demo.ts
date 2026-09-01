/**
 * Flujo de trabajo: Tropera completo — establecimientos, existencias
 * agregadas, movimientos (con el ajuste transaccional de stock), eventos,
 * y las 6 sub-fases de Fase E (seguimiento individual, diagnóstico
 * reproductivo, muestreos/genética, potreros/apartados, plantillas 1-tap,
 * protocolos IATF/tareas programadas), contra Postgres real (PGlite/WASM).
 * Misma lógica que los *.service.ts de cada módulo bajo `src/tropera/`.
 *
 * Correr:  pnpm --filter backend test:tropera-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, asc, desc, eq, max, sql } from 'drizzle-orm';
import { organizaciones, usuarios } from '../src/database/schema/core';
import {
  establecimientos, existencias, movimientos, eventos, animalesCampo,
  hallazgos, torosVirtuales, muestras, evaluacionesAndrologicas,
  potreros, plantillasTareas, plantillaItems, protocolosIatf, protocoloIatfPasos, tareas,
} from '../src/database/schema/tropera';
import { HALLAZGOS_DEFAULT } from '../src/tropera/hallazgos/hallazgos-default';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

const CATEGORIAS = ['vaca', 'toro', 'ternero', 'ternera', 'vaquillona', 'novillo'] as const;
const TIPOS_ALTA = new Set(['nacimiento', 'compra']);
const TIPOS_BAJA = new Set(['muerte', 'venta']);

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA tropera;
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TYPE tropera.categoria_hacienda AS ENUM ('vaca','toro','ternero','ternera','vaquillona','novillo');
    CREATE TYPE tropera.tipo_movimiento AS ENUM ('nacimiento','compra','muerte','venta','traslado');
    CREATE TYPE tropera.tipo_evento AS ENUM ('vacunacion','desparasitacion','tratamiento','servicio','diagnostico_prenez','destete');
    CREATE TYPE tropera.estado_animal_campo AS ENUM ('activo','vendido','muerto','transferido');
    CREATE TYPE tropera.resultado_reproductivo AS ENUM ('prenada','vacia','anestro');
    CREATE TYPE tropera.estado_tarea AS ENUM ('pendiente','completada','cancelada');
    CREATE SEQUENCE tropera.animales_campo_temp_seq;
    CREATE TABLE tropera.establecimientos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, ubicacion text, superficie_ha numeric(10,2),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.existencias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      categoria tropera.categoria_hacienda NOT NULL, cantidad integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.movimientos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      tipo tropera.tipo_movimiento NOT NULL, categoria tropera.categoria_hacienda NOT NULL, cantidad integer NOT NULL,
      establecimiento_origen_id uuid REFERENCES tropera.establecimientos(id),
      establecimiento_destino_id uuid REFERENCES tropera.establecimientos(id),
      fecha date NOT NULL DEFAULT current_date, observaciones text, usuario_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.animales_campo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      caravana text NOT NULL, caravana_definitiva boolean NOT NULL DEFAULT true,
      categoria tropera.categoria_hacienda NOT NULL, potrero_id uuid, sexo text,
      estado tropera.estado_animal_campo NOT NULL DEFAULT 'activo', fecha_alta date NOT NULL DEFAULT current_date,
      observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.eventos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      tipo tropera.tipo_evento NOT NULL, categoria tropera.categoria_hacienda, cantidad integer, producto text,
      fecha date NOT NULL DEFAULT current_date, observaciones text, usuario_id uuid,
      animal_campo_id uuid REFERENCES tropera.animales_campo(id), retiro_hasta date,
      hallazgo_id uuid, resultado_reproductivo tropera.resultado_reproductivo, toro_virtual_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.hallazgos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.toros_virtuales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, raza text, proveedor text, observaciones text, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.muestras (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      animal_campo_id uuid REFERENCES tropera.animales_campo(id), caravana text, tubo_numero integer NOT NULL,
      tipo_muestra text, fecha date NOT NULL DEFAULT current_date, observaciones text, usuario_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.evaluaciones_andrologicas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_campo_id uuid NOT NULL REFERENCES tropera.animales_campo(id) ON DELETE CASCADE,
      circunferencia_escrotal_cm numeric(5,1) NOT NULL, motilidad_porcentaje numeric(5,1) NOT NULL, apto boolean NOT NULL,
      fecha date NOT NULL DEFAULT current_date, observaciones text, usuario_id uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE tropera.potreros (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      nombre text NOT NULL, superficie_ha numeric(10,2), capacidad_cabezas integer, observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.plantillas_tareas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.plantilla_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plantilla_id uuid NOT NULL REFERENCES tropera.plantillas_tareas(id) ON DELETE CASCADE,
      tipo tropera.tipo_evento NOT NULL, producto text, orden integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE tropera.protocolos_iatf (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, descripcion text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE tropera.protocolo_iatf_pasos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      protocolo_id uuid NOT NULL REFERENCES tropera.protocolos_iatf(id) ON DELETE CASCADE,
      dia_offset integer NOT NULL, descripcion text NOT NULL, producto text, orden integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE tropera.tareas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      establecimiento_id uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
      animal_campo_id uuid REFERENCES tropera.animales_campo(id), protocolo_id uuid REFERENCES tropera.protocolos_iatf(id),
      descripcion text NOT NULL, producto text, fecha_programada date NOT NULL,
      estado tropera.estado_tarea NOT NULL DEFAULT 'pendiente', observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
  `);

  const db = drizzle(client, {
    schema: {
      organizaciones, usuarios, establecimientos, existencias, movimientos, eventos, animalesCampo,
      hallazgos, torosVirtuales, muestras, evaluacionesAndrologicas,
      potreros, plantillasTareas, plantillaItems, protocolosIatf, protocoloIatfPasos, tareas,
    },
  });
  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Estancia A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Estancia B' }).returning();
  const [capataz] = await db.insert(usuarios).values({ email: 'capataz@a.com', passwordHash: 'x', nombre: 'Juan' }).returning();
  const [estA] = await db.insert(establecimientos).values({ organizacionId: orgA.id, nombre: 'Campo Norte' }).returning();
  const [estDestino] = await db.insert(establecimientos).values({ organizacionId: orgA.id, nombre: 'Campo Sur' }).returning();

  // ---- Lógica replicada de ExistenciasService ----
  async function fijarExistencia(orgId: string, estId: string, categoria: string, cantidad: number) {
    const [fila] = await db.select().from(existencias)
      .where(and(eq(existencias.establecimientoId, estId), eq(existencias.categoria, categoria as any))).limit(1);
    if (fila) {
      const [act] = await db.update(existencias).set({ cantidad, updatedAt: new Date() }).where(eq(existencias.id, fila.id)).returning();
      return act;
    }
    const [nueva] = await db.insert(existencias).values({ organizacionId: orgId, establecimientoId: estId, categoria: categoria as any, cantidad }).returning();
    return nueva;
  }
  async function listarExistencias(estId: string) {
    const filas = await db.select().from(existencias).where(eq(existencias.establecimientoId, estId));
    return CATEGORIAS.map((c) => filas.find((f) => f.categoria === c) ?? { categoria: c, cantidad: 0 });
  }

  // ---- Lógica replicada de aplicar-movimiento.ts + MovimientosService.crear() ----
  async function crearMovimiento(orgId: string, dto: { tipo: string; categoria: string; cantidad: number; establecimientoId: string; establecimientoDestinoId?: string }) {
    const esAlta = TIPOS_ALTA.has(dto.tipo);
    const esBaja = TIPOS_BAJA.has(dto.tipo);
    const esTraslado = dto.tipo === 'traslado';
    const origenId = esAlta ? undefined : dto.establecimientoId;
    const destinoId = esBaja ? undefined : (esTraslado ? dto.establecimientoDestinoId : dto.establecimientoId);

    return db.transaction(async (tx) => {
      const ajustarCategoria = async (estId: string, delta: number) => {
        const [fila] = await tx.select().from(existencias)
          .where(and(eq(existencias.establecimientoId, estId), eq(existencias.categoria, dto.categoria as any))).limit(1);
        const actual = fila?.cantidad ?? 0;
        const nueva = actual + delta;
        if (nueva < 0) throw new Error(`Stock insuficiente de "${dto.categoria}" (hay ${actual})`);
        if (fila) await tx.update(existencias).set({ cantidad: nueva, updatedAt: new Date() }).where(eq(existencias.id, fila.id));
        else await tx.insert(existencias).values({ organizacionId: orgId, establecimientoId: estId, categoria: dto.categoria as any, cantidad: nueva });
      };
      if (origenId) await ajustarCategoria(origenId, -dto.cantidad);
      if (destinoId) await ajustarCategoria(destinoId, dto.cantidad);

      const [mov] = await tx.insert(movimientos).values({
        organizacionId: orgId, tipo: dto.tipo as any, categoria: dto.categoria as any, cantidad: dto.cantidad,
        establecimientoOrigenId: origenId, establecimientoDestinoId: destinoId,
      }).returning();
      return mov;
    });
  }

  // ---- Lógica replicada de AnimalesCampoService ----
  async function altaAnimalCampo(orgId: string, estId: string, categoria: string, caravana?: string) {
    let car = caravana;
    let definitiva = true;
    if (!car) {
      const r = await db.execute(sql`SELECT nextval('tropera.animales_campo_temp_seq') AS n`);
      car = `TEMP-${(r.rows[0] as any).n}`;
      definitiva = false;
    }
    const [a] = await db.insert(animalesCampo).values({ organizacionId: orgId, establecimientoId: estId, caravana: car, caravanaDefinitiva: definitiva, categoria: categoria as any }).returning();
    return a;
  }
  async function conciliar(id: string, caravana: string) {
    const [actual] = await db.select().from(animalesCampo).where(eq(animalesCampo.id, id)).limit(1);
    if (actual.caravanaDefinitiva) throw new Error('Ya tiene caravana definitiva');
    const [a] = await db.update(animalesCampo).set({ caravana, caravanaDefinitiva: true, updatedAt: new Date() }).where(eq(animalesCampo.id, id)).returning();
    return a;
  }

  // ---- Lógica replicada de HallazgosService (E.2) ----
  async function listarHallazgos(orgId: string): Promise<(typeof hallazgos.$inferSelect)[]> {
    const propios = await db.select().from(hallazgos).where(eq(hallazgos.organizacionId, orgId));
    if (propios.length === 0) {
      await db.insert(hallazgos).values(HALLAZGOS_DEFAULT.map((nombre) => ({ organizacionId: orgId, nombre })));
      return listarHallazgos(orgId);
    }
    return propios;
  }

  // ---- Lógica replicada de EvaluacionesAndrologicasService (E.3) — mismos umbrales que el service real ----
  const CIRCUNFERENCIA_MINIMA_CM = 30;
  const MOTILIDAD_MINIMA_PORCENTAJE = 50;
  async function evaluarAndrologica(orgId: string, animalId: string, circunferencia: number, motilidad: number) {
    const apto = circunferencia >= CIRCUNFERENCIA_MINIMA_CM && motilidad >= MOTILIDAD_MINIMA_PORCENTAJE;
    const [ev] = await db.insert(evaluacionesAndrologicas).values({
      organizacionId: orgId, animalCampoId: animalId,
      circunferenciaEscrotalCm: circunferencia.toString(), motilidadPorcentaje: motilidad.toString(), apto,
    }).returning();
    return ev;
  }

  // ---- Lógica replicada de MuestrasService (E.3) ----
  async function crearMuestra(orgId: string, estId: string, tuboNumero: number, opts: { animalCampoId?: string; caravana?: string } = {}) {
    const [m] = await db.insert(muestras).values({ organizacionId: orgId, establecimientoId: estId, tuboNumero, ...opts }).returning();
    return m;
  }
  async function ultimoTubo(estId: string) {
    const [{ max: m }] = await db.select({ max: max(muestras.tuboNumero) }).from(muestras).where(eq(muestras.establecimientoId, estId));
    return m ?? 0;
  }

  // ---- Lógica replicada de PlantillasTareasService.aplicar() (E.5) ----
  async function crearPlantilla(orgId: string, nombre: string, items: { tipo: string; producto?: string }[]) {
    const [p] = await db.insert(plantillasTareas).values({ organizacionId: orgId, nombre }).returning();
    await db.insert(plantillaItems).values(items.map((it, i) => ({ plantillaId: p.id, tipo: it.tipo as any, producto: it.producto, orden: i })));
    return p;
  }
  async function aplicarPlantilla(orgId: string, plantillaId: string, estId: string, animalId: string, usuarioId: string) {
    const items = await db.select().from(plantillaItems).where(eq(plantillaItems.plantillaId, plantillaId)).orderBy(asc(plantillaItems.orden));
    return db.transaction(async (tx) => {
      const creados = [];
      for (const item of items) {
        const [ev] = await tx.insert(eventos).values({
          organizacionId: orgId, establecimientoId: estId, animalCampoId: animalId, tipo: item.tipo, producto: item.producto, usuarioId,
        }).returning();
        creados.push(ev);
      }
      return creados;
    });
  }

  // ---- Lógica replicada de ProtocolosIatfService.aplicar() (E.6) ----
  async function crearProtocolo(orgId: string, nombre: string, pasos: { diaOffset: number; descripcion: string; producto?: string }[]) {
    const [p] = await db.insert(protocolosIatf).values({ organizacionId: orgId, nombre }).returning();
    await db.insert(protocoloIatfPasos).values(pasos.map((paso, i) => ({ protocoloId: p.id, diaOffset: paso.diaOffset, descripcion: paso.descripcion, producto: paso.producto, orden: i })));
    return p;
  }
  async function aplicarProtocolo(orgId: string, protocoloId: string, estId: string, animalId: string, fechaInicio: string) {
    const pasos = await db.select().from(protocoloIatfPasos).where(eq(protocoloIatfPasos.protocoloId, protocoloId)).orderBy(asc(protocoloIatfPasos.orden));
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    return db.transaction(async (tx) => {
      const creadas = [];
      for (const paso of pasos) {
        const fecha = new Date(inicio);
        fecha.setDate(fecha.getDate() + paso.diaOffset);
        const [t] = await tx.insert(tareas).values({
          organizacionId: orgId, establecimientoId: estId, animalCampoId: animalId, protocoloId,
          descripcion: paso.descripcion, producto: paso.producto, fechaProgramada: fecha.toISOString().slice(0, 10),
        }).returning();
        creadas.push(t);
      }
      return creadas;
    });
  }
  async function completarTarea(id: string) {
    const [t] = await db.update(tareas).set({ estado: 'completada', updatedAt: new Date() }).where(eq(tareas.id, id)).returning();
    return t;
  }

  // ============================== Pruebas ==============================
  console.log('1) Existencias: fijar es upsert, listar completa las 6 categorías en 0');
  const vacia = await listarExistencias(estA.id);
  check('las 6 categorías arrancan en 0', vacia.every((e) => e.cantidad === 0) && vacia.length === 6);
  await fijarExistencia(orgA.id, estA.id, 'vaca', 10);
  await fijarExistencia(orgA.id, estA.id, 'vaca', 12);
  const conVacas = await listarExistencias(estA.id);
  check('fijar dos veces actualiza, no duplica', conVacas.find((e) => e.categoria === 'vaca')!.cantidad === 12);

  console.log('2) Movimientos: alta suma, baja resta, traslado mueve entre establecimientos');
  await crearMovimiento(orgA.id, { tipo: 'compra', categoria: 'toro', cantidad: 5, establecimientoId: estA.id });
  let existToro = await listarExistencias(estA.id);
  check('compra sumó', existToro.find((e) => e.categoria === 'toro')!.cantidad === 5);

  await crearMovimiento(orgA.id, { tipo: 'venta', categoria: 'toro', cantidad: 2, establecimientoId: estA.id });
  existToro = await listarExistencias(estA.id);
  check('venta restó', existToro.find((e) => e.categoria === 'toro')!.cantidad === 3);

  let rechazoNegativo = false;
  try { await crearMovimiento(orgA.id, { tipo: 'venta', categoria: 'toro', cantidad: 999, establecimientoId: estA.id }); }
  catch { rechazoNegativo = true; }
  check('venta que dejaría stock negativo se rechaza', rechazoNegativo);
  existToro = await listarExistencias(estA.id);
  check('el rechazo no dejó nada aplicado a medias', existToro.find((e) => e.categoria === 'toro')!.cantidad === 3);

  await crearMovimiento(orgA.id, { tipo: 'traslado', categoria: 'toro', cantidad: 1, establecimientoId: estA.id, establecimientoDestinoId: estDestino.id });
  existToro = await listarExistencias(estA.id);
  const existDestino = await listarExistencias(estDestino.id);
  check('traslado restó en origen', existToro.find((e) => e.categoria === 'toro')!.cantidad === 2);
  check('traslado sumó en destino (creando la fila)', existDestino.find((e) => e.categoria === 'toro')!.cantidad === 1);

  console.log('3) Eventos: agregado por categoría y puntual sobre un animal, con retiro sanitario');
  const [eventoAgregado] = await db.insert(eventos).values({ organizacionId: orgA.id, establecimientoId: estA.id, tipo: 'vacunacion', categoria: 'toro', cantidad: 3 }).returning();
  check('evento agregado no requiere animal', eventoAgregado.animalCampoId === null);

  console.log('4) Animales individuales (E.1): alta transitoria con secuencia, conciliación, aislamiento');
  const t1 = await altaAnimalCampo(orgA.id, estA.id, 'vaca');
  const t2 = await altaAnimalCampo(orgA.id, estA.id, 'ternero');
  check('primera alta transitoria es TEMP-1', t1.caravana === 'TEMP-1');
  check('segunda alta transitoria es TEMP-2 (secuencia correlativa)', t2.caravana === 'TEMP-2');
  check('alta transitoria queda sin conciliar', t1.caravanaDefinitiva === false);

  const conCaravanaReal = await altaAnimalCampo(orgA.id, estA.id, 'toro', 'AR-4521');
  check('alta con caravana real queda definitiva desde el inicio', conCaravanaReal.caravanaDefinitiva === true);

  const conciliado = await conciliar(t1.id, 'AR-9001');
  check('conciliar asigna la caravana real', conciliado.caravana === 'AR-9001');
  check('conciliar marca caravanaDefinitiva', conciliado.caravanaDefinitiva === true);

  let rechazoReconciliar = false;
  try { await conciliar(t1.id, 'AR-0000'); } catch { rechazoReconciliar = true; }
  check('conciliar una segunda vez se rechaza', rechazoReconciliar);

  const [eventoImputado] = await db.insert(eventos).values({
    organizacionId: orgA.id, establecimientoId: estA.id, tipo: 'tratamiento', animalCampoId: conciliado.id, retiroHasta: '2026-09-15',
  }).returning();
  const historialAnimal = await db.select().from(eventos).where(eq(eventos.animalCampoId, conciliado.id));
  check('el evento imputado aparece en el historial del animal', historialAnimal.length === 1 && historialAnimal[0].id === eventoImputado.id);
  check('el retiro sanitario quedó guardado', historialAnimal[0].retiroHasta === '2026-09-15');

  console.log('5) Hallazgos (E.2): siembra lazy del catálogo default, aislada por organización');
  const hallazgosA = await listarHallazgos(orgA.id);
  check(`se sembraron las ${HALLAZGOS_DEFAULT.length} hallazgos default`, hallazgosA.length === HALLAZGOS_DEFAULT.length);
  const hallazgosA2 = await listarHallazgos(orgA.id);
  check('pedirlos de nuevo no duplica (siembra idempotente)', hallazgosA2.length === HALLAZGOS_DEFAULT.length);
  const hallazgosB = await listarHallazgos(orgB.id);
  check('orgB tiene su propio catálogo (filas independientes)', hallazgosB.length === HALLAZGOS_DEFAULT.length && hallazgosB[0].id !== hallazgosA[0].id);

  console.log('6) Diagnóstico reproductivo (E.2): resultado + hallazgo imputados a un animal');
  const [eventoReproductivo] = await db.insert(eventos).values({
    organizacionId: orgA.id, establecimientoId: estA.id, tipo: 'diagnostico_prenez',
    animalCampoId: conciliado.id, resultadoReproductivo: 'vacia', hallazgoId: hallazgosA[0].id,
  }).returning();
  check('el resultado reproductivo quedó guardado', eventoReproductivo.resultadoReproductivo === 'vacia');
  check('el hallazgo quedó asociado', eventoReproductivo.hallazgoId === hallazgosA[0].id);

  console.log('7) Toros virtuales (E.3): catálogo de genética referenciado desde un servicio');
  const [toroVirtual] = await db.insert(torosVirtuales).values({ organizacionId: orgA.id, nombre: 'Pajuela Angus 004', raza: 'Angus' }).returning();
  const [eventoServicio] = await db.insert(eventos).values({
    organizacionId: orgA.id, establecimientoId: estA.id, tipo: 'servicio', animalCampoId: conciliado.id, toroVirtualId: toroVirtual.id,
  }).returning();
  check('el evento de servicio quedó con el toro virtual', eventoServicio.toroVirtualId === toroVirtual.id);

  console.log('8) Muestreos caravana-tubo (E.3): tubos correlativos y último tubo');
  check('sin muestras, el último tubo es 0', (await ultimoTubo(estA.id)) === 0);
  await crearMuestra(orgA.id, estA.id, 1, { animalCampoId: conciliado.id });
  await crearMuestra(orgA.id, estA.id, 2, { caravana: 'AR-7777' });
  check('el último tubo ahora es 2', (await ultimoTubo(estA.id)) === 2);
  const muestrasEstA = await db.select().from(muestras).where(eq(muestras.establecimientoId, estA.id));
  check('quedaron las 2 muestras', muestrasEstA.length === 2);

  console.log('9) Evaluación andrológica (E.3): apto/no apto calculado por el service, no por el cliente');
  const aptoRes = await evaluarAndrologica(orgA.id, conCaravanaReal.id, 35, 60);
  const noAptoRes = await evaluarAndrologica(orgA.id, conCaravanaReal.id, 25, 40);
  check('35cm/60% da apto', aptoRes.apto === true);
  check('25cm/40% da no apto', noAptoRes.apto === false);
  const historialAndrologico = await db.select().from(evaluacionesAndrologicas)
    .where(eq(evaluacionesAndrologicas.animalCampoId, conCaravanaReal.id)).orderBy(desc(evaluacionesAndrologicas.createdAt));
  check('el historial trae las 2 evaluaciones', historialAndrologico.length === 2);

  console.log('10) Potreros y Apartados Rápidos (E.4)');
  const [potreroNorte] = await db.insert(potreros).values({ organizacionId: orgA.id, establecimientoId: estA.id, nombre: 'Potrero Norte', superficieHa: '50' }).returning();
  await db.update(animalesCampo).set({ potreroId: potreroNorte.id, updatedAt: new Date() }).where(eq(animalesCampo.id, conciliado.id));
  const enElPotrero = await db.select().from(animalesCampo).where(eq(animalesCampo.potreroId, potreroNorte.id));
  check('el apartado rápido (PATCH de potreroId) movió al animal', enElPotrero.length === 1 && enElPotrero[0].id === conciliado.id);

  console.log('11) Modo Plantilla 1-tap (E.5): aplicar crea todos los eventos de una');
  const plantilla = await crearPlantilla(orgA.id, 'Rutina de manga', [
    { tipo: 'vacunacion', producto: 'Aftosa' },
    { tipo: 'desparasitacion', producto: 'Ivermectina' },
    { tipo: 'tratamiento', producto: 'Pesaje' },
  ]);
  const eventosDePlantilla = await aplicarPlantilla(orgA.id, plantilla.id, estA.id, t2.id, capataz.id);
  check('la plantilla de 3 ítems creó exactamente 3 eventos', eventosDePlantilla.length === 3);
  check('los 3 quedaron imputados al mismo animal', eventosDePlantilla.every((e) => e.animalCampoId === t2.id));

  console.log('12) Protocolos IATF (E.6): genera tareas programadas en las fechas correctas');
  const protocolo = await crearProtocolo(orgA.id, 'IATF estándar', [
    { diaOffset: 0, descripcion: 'Colocar dispositivo + GnRH', producto: 'Dispositivo P4' },
    { diaOffset: 7, descripcion: 'Aplicar PGF2a', producto: 'Prostaglandina' },
    { diaOffset: 9, descripcion: 'Retirar dispositivo + eCG' },
    { diaOffset: 11, descripcion: 'Inseminación a tiempo fijo' },
  ]);
  const tareasGeneradas = await aplicarProtocolo(orgA.id, protocolo.id, estA.id, t2.id, '2026-09-01');
  check('se generó una tarea por paso', tareasGeneradas.length === 4);
  check('día 0 → 2026-09-01', tareasGeneradas[0].fechaProgramada === '2026-09-01');
  check('día 7 → 2026-09-08', tareasGeneradas[1].fechaProgramada === '2026-09-08');
  check('día 9 → 2026-09-10', tareasGeneradas[2].fechaProgramada === '2026-09-10');
  check('día 11 → 2026-09-12', tareasGeneradas[3].fechaProgramada === '2026-09-12');
  check('las tareas arrancan pendientes', tareasGeneradas.every((t) => t.estado === 'pendiente'));

  await completarTarea(tareasGeneradas[0].id);
  const pendientes = await db.select().from(tareas).where(and(eq(tareas.establecimientoId, estA.id), eq(tareas.estado, 'pendiente')));
  check('completar una tarea la saca del filtro de pendientes', pendientes.length === tareasGeneradas.length - 1);

  console.log('13) Aislamiento entre organizaciones');
  const propiosDeB = await db.select().from(establecimientos).where(eq(establecimientos.organizacionId, orgB.id));
  check('la organización B no ve los establecimientos de A', propiosDeB.length === 0);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
