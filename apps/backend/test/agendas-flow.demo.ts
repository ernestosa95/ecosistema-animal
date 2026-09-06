/**
 * Agendas y bloques de turnos: horario recurrente + excepciones puntuales +
 * cálculo de slots + validación de solapamiento al crear/reprogramar un
 * turno — contra un Postgres real (PGlite/WASM), usando las clases REALES
 * (AgendasService, TurnosService), no una reimplementación — mismo estilo
 * que plataforma-flow.demo.ts.
 *
 * Correr: pnpm --filter backend test:agendas-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as core from '../src/database/schema/core';
import * as hce from '../src/database/schema/hce';
import { AgendasService } from '../src/hce/agendas/agendas.service';
import { TurnosService } from '../src/hce/turnos/turnos.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA hce;
    CREATE TYPE core.sexo_persona AS ENUM ('masculino','femenino','otro');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TYPE hce.estado_turno AS ENUM ('solicitado','confirmado','reprogramado','cancelado','atendido','ausente');
    CREATE TYPE hce.tipo_excepcion_agenda AS ENUM ('cierre','apertura_extra');

    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false,
      cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false, logo_url text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz, password_changed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.personas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id), usuario_id uuid, dni text,
      nombre text NOT NULL, apellido text NOT NULL, sexo core.sexo_persona, fecha_nacimiento date,
      celular text, telefono text, email text, domicilio text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid REFERENCES core.personas(id), especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo', datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);

    CREATE TABLE hce.agendas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, usuario_id uuid REFERENCES core.usuarios(id),
      duracion_turno_minutos integer NOT NULL DEFAULT 30, color text, activa boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.agenda_bloques (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agenda_id uuid NOT NULL REFERENCES hce.agendas(id) ON DELETE CASCADE,
      dia_semana integer NOT NULL, hora_inicio time NOT NULL, hora_fin time NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.agenda_excepciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agenda_id uuid NOT NULL REFERENCES hce.agendas(id) ON DELETE CASCADE,
      fecha date NOT NULL, tipo hce.tipo_excepcion_agenda NOT NULL,
      hora_inicio time, hora_fin time, motivo text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.turnos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid REFERENCES core.animales(id), persona_id uuid REFERENCES core.personas(id),
      agenda_id uuid REFERENCES hce.agendas(id),
      fecha_hora timestamptz NOT NULL, estado hce.estado_turno NOT NULL DEFAULT 'solicitado',
      motivo text, canal text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { ...core, ...hce } });
  const agendasService = new AgendasService(db as any);
  const turnosService = new TurnosService(db as any, agendasService);

  const [orgA] = await db.insert(core.organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(core.organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [vet] = await db.insert(core.usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana', apellido: 'Vet' }).returning();
  const [duenio] = await db.insert(core.personas).values({ organizacionId: orgA.id, nombre: 'Juan', apellido: 'Pérez' }).returning();
  const [can] = await db.insert(core.especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
  const [firu] = await db.insert(core.animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais', personaId: duenio.id }).returning();

  // Fecha de prueba fija; el día de semana se calcula (no se asume a mano).
  const FECHA = '2024-09-10';
  const diaSemana = new Date(`${FECHA}T00:00:00`).getDay();
  const OTRA_FECHA_SIN_BLOQUE = '2024-09-11'; // día siguiente: día de semana distinto, sin bloque cargado

  console.log('1) Alta de agenda con y sin profesional');
  const agendaVet = await agendasService.crear(orgA.id, { nombre: 'Dra. Ana', usuarioId: vet.id, duracionTurnoMinutos: 30 });
  check('agenda con profesional se creó', !!agendaVet.id && agendaVet.usuarioId === vet.id);
  const agendaPeluqueria = await agendasService.crear(orgA.id, { nombre: 'Peluquería canina', duracionTurnoMinutos: 60 });
  check('agenda sin profesional se creó', !!agendaPeluqueria.id && !agendaPeluqueria.usuarioId);
  const listado = await agendasService.listar(orgA.id);
  check('listar trae las 2 agendas con el nombre del profesional resuelto', listado.length === 2
    && listado.find((a) => a.id === agendaVet.id)?.usuarioNombre === 'Ana Vet');

  console.log('2) Bloque recurrente');
  await agendasService.crearBloque(orgA.id, agendaVet.id, { diaSemana, horaInicio: '09:00', horaFin: '10:00' });
  const bloques = await agendasService.listarBloques(orgA.id, agendaVet.id);
  check('el bloque quedó cargado', bloques.length === 1);
  let horaInvalida = false;
  try { await agendasService.crearBloque(orgA.id, agendaVet.id, { diaSemana, horaInicio: '10:00', horaFin: '09:00' }); }
  catch { horaInvalida = true; }
  check('rechaza horaInicio >= horaFin', horaInvalida);

  console.log('3) Cálculo de slots');
  const slotsBase = await agendasService.slotsDisponibles(orgA.id, agendaVet.id, FECHA);
  check('bloque de 60 min a slots de 30 min da 2 slots', slotsBase.length === 2
    && slotsBase[0].hora === '09:00' && slotsBase[1].hora === '09:30');
  check('los 2 slots arrancan disponibles', slotsBase.every((s) => s.disponible));

  const sinBloque = await agendasService.slotsDisponibles(orgA.id, agendaVet.id, OTRA_FECHA_SIN_BLOQUE);
  check('un día sin bloque recurrente no tiene slots', sinBloque.length === 0);

  await agendasService.crearExcepcion(orgA.id, agendaVet.id, { fecha: FECHA, tipo: 'cierre' });
  check('excepción de cierre de día completo deja sin slots', (await agendasService.slotsDisponibles(orgA.id, agendaVet.id, FECHA)).length === 0);
  const cierreCompleto = await agendasService.listarExcepciones(orgA.id, agendaVet.id);
  await agendasService.eliminarExcepcion(orgA.id, agendaVet.id, cierreCompleto[0].id);
  check('sin la excepción, los slots vuelven', (await agendasService.slotsDisponibles(orgA.id, agendaVet.id, FECHA)).length === 2);

  await agendasService.crearExcepcion(orgA.id, agendaVet.id, { fecha: FECHA, tipo: 'cierre', horaInicio: '09:00', horaFin: '09:30' });
  const conCierreParcial = await agendasService.slotsDisponibles(orgA.id, agendaVet.id, FECHA);
  check('cierre parcial recorta sólo el slot afectado', conCierreParcial.length === 1 && conCierreParcial[0].hora === '09:30');
  const excParcial = await agendasService.listarExcepciones(orgA.id, agendaVet.id);
  await agendasService.eliminarExcepcion(orgA.id, agendaVet.id, excParcial[0].id);

  await agendasService.crearExcepcion(orgA.id, agendaVet.id, { fecha: FECHA, tipo: 'apertura_extra', horaInicio: '14:00', horaFin: '14:30' });
  const conAperturaExtra = await agendasService.slotsDisponibles(orgA.id, agendaVet.id, FECHA);
  check('apertura extra suma una ventana', conAperturaExtra.length === 3 && conAperturaExtra.some((s) => s.hora === '14:00'));

  console.log('4) Crear turno dentro de un slot válido');
  const t1 = await turnosService.solicitar(orgA.id, {
    animalId: firu.id, fechaHora: `${FECHA}T09:00:00`, agendaId: agendaVet.id, estado: 'confirmado',
  } as any);
  check('el turno se creó con estado confirmado (fix del bug que ignoraba dto.estado)', t1.estado === 'confirmado');
  check('el turno quedó con la agenda asignada', t1.agendaId === agendaVet.id);

  console.log('5) Rechaza horario fuera de los slots de la agenda');
  let fueraDeHorario = false;
  try { await turnosService.solicitar(orgA.id, { animalId: firu.id, fechaHora: `${FECHA}T20:00:00`, agendaId: agendaVet.id } as any); }
  catch { fueraDeHorario = true; }
  check('rechaza un horario que no es un slot de la agenda', fueraDeHorario);

  console.log('6) Rechaza un slot ya tomado');
  let slotOcupado = false;
  try { await turnosService.solicitar(orgA.id, { animalId: firu.id, fechaHora: `${FECHA}T09:00:00`, agendaId: agendaVet.id } as any); }
  catch { slotOcupado = true; }
  check('rechaza reservar un slot ya tomado por otro turno no cancelado', slotOcupado);
  check('el slot 09:00 ahora figura ocupado', !(await agendasService.slotsDisponibles(orgA.id, agendaVet.id, FECHA)).find((s) => s.hora === '09:00')!.disponible);

  console.log('7) Reprogramar el mismo turno a su propio horario no choca consigo mismo');
  const repro = await turnosService.cambiarEstado(orgA.id, t1.id, { estado: 'reprogramado', fechaHora: `${FECHA}T09:00:00` } as any);
  check('reprogramar al mismo horario no lo rechaza', repro.estado === 'reprogramado');

  console.log('8) Cancelar libera el slot');
  await turnosService.cambiarEstado(orgA.id, t1.id, { estado: 'cancelado' } as any);
  const slotsTrasCancelar = await agendasService.slotsDisponibles(orgA.id, agendaVet.id, FECHA);
  check('el slot 09:00 vuelve a estar disponible tras cancelar', slotsTrasCancelar.find((s) => s.hora === '09:00')!.disponible);
  const t2 = await turnosService.solicitar(orgA.id, {
    animalId: firu.id, fechaHora: `${FECHA}T09:00:00`, agendaId: agendaVet.id,
  } as any);
  check('otro turno puede tomar el slot que quedó libre', !!t2.id);

  console.log('9) Aislamiento entre organizaciones');
  let agendaAjena = false;
  try { await agendasService.crearBloque(orgB.id, agendaVet.id, { diaSemana, horaInicio: '08:00', horaFin: '09:00' }); }
  catch { agendaAjena = true; }
  check('otra organización no puede tocar una agenda ajena', agendaAjena);
  check('la organización B no ve las agendas de A', (await agendasService.listar(orgB.id)).length === 0);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
