/**
 * Prueba de UsuariosService: alta self-service de miembros por un
 * propietario/admin de la propia organización (`agregarMiembro`, nuevo —
 * antes esto sólo existía vía /admin para el super-admin de plataforma),
 * `limitesPlan` (cupo por rol + usados, para el wizard de configuración
 * rápida) y el reset de contraseña ya existente, contra un Postgres real
 * (PGlite/WASM). Mismo estilo que plataforma-flow.demo.ts.
 *
 * Correr: pnpm --filter backend test:usuarios-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as core from '../src/database/schema/core';
import * as plataforma from '../src/database/schema/plataforma';
import { UsuariosService } from '../src/core/usuarios/usuarios.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA plataforma;
    CREATE TYPE core.rol_membresia AS ENUM ('propietario','admin','capataz','veterinario','recepcion');

    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false, logo_url text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz, password_changed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.membresias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      rol core.rol_membresia[] NOT NULL, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);

    CREATE TABLE plataforma.planes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      precio_mensual numeric(12,2), precio_anual numeric(12,2),
      limites_roles jsonb NOT NULL DEFAULT '{}'::jsonb,
      descripcion text, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { ...core, ...plataforma } });
  const usuariosService = new UsuariosService(db as any);

  const [plan] = await db.insert(plataforma.planes).values({
    nombre: 'Plan Chico', limitesRoles: { veterinario: 1, recepcion: 0 },
  }).returning();
  const [org] = await db.insert(core.organizaciones).values({ nombre: 'Vet Demo', planId: plan.id }).returning();
  const [propietario] = await db.insert(core.usuarios).values({ email: 'due@vet.com', passwordHash: 'x' }).returning();
  await db.insert(core.membresias).values({ usuarioId: propietario.id, organizacionId: org.id, roles: ['propietario'] });

  // Usuario que ya existe en la plataforma (ej. staff de otra organización) pero todavía no es miembro de `org`.
  const [otraOrg] = await db.insert(core.organizaciones).values({ nombre: 'Otra Vet' }).returning();
  const [compartido] = await db.insert(core.usuarios).values({ email: 'compartido@otrovet.com', passwordHash: 'x' }).returning();
  await db.insert(core.membresias).values({ usuarioId: compartido.id, organizacionId: otraOrg.id, roles: ['veterinario'] });

  console.log('1) limitesPlan(): refleja el cupo del plan y cuántos hay usados (el propietario ya cuenta)');
  const limitesIniciales = await usuariosService.limitesPlan(org.id);
  check('propietario: sin límite en el plan → limite null', limitesIniciales.propietario.limite === null);
  check('propietario: 1 usado (el que ya existe)', limitesIniciales.propietario.usados === 1);
  check('veterinario: límite 1, 0 usados', limitesIniciales.veterinario.limite === 1 && limitesIniciales.veterinario.usados === 0);
  check('recepcion: límite 0 (no incluido en el plan)', limitesIniciales.recepcion.limite === 0);

  console.log('2) agregarMiembro(): alta de un usuario nuevo dentro del cupo');
  const altaVet = await usuariosService.agregarMiembro(org.id, {
    email: 'vet1@vet.com', password: 'password123', roles: ['veterinario'], nombre: 'Vera', apellido: 'Vet',
  } as any);
  check('se creó el usuario', altaVet.creado === true);
  check('con el rol pedido', altaVet.roles.includes('veterinario'));

  console.log('3) agregarMiembro(): un segundo veterinario excede el cupo del plan y se rechaza');
  let rechazadoPorCupo = false;
  try {
    await usuariosService.agregarMiembro(org.id, { email: 'vet2@vet.com', password: 'password123', roles: ['veterinario'] } as any);
  } catch (e: any) {
    rechazadoPorCupo = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('rechaza con 400', rechazadoPorCupo);

  console.log('4) agregarMiembro(): un rol en cero (recepción) rechaza cualquier alta, no lo trata como "sin límite"');
  let rechazadoRecepcion = false;
  try {
    await usuariosService.agregarMiembro(org.id, { email: 'rec1@vet.com', password: 'password123', roles: ['recepcion'] } as any);
  } catch (e: any) {
    rechazadoRecepcion = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('rechaza con 400', rechazadoRecepcion);

  console.log('5) agregarMiembro(): un email que ya tiene cuenta en la plataforma (de otra organización) se reutiliza, sin exigir password');
  const altaReutilizada = await usuariosService.agregarMiembro(org.id, { email: 'compartido@otrovet.com', roles: ['admin'] } as any);
  check('no crea un usuario nuevo (reutiliza el existente)', altaReutilizada.creado === false);
  check('devuelve el mismo id de usuario', altaReutilizada.usuario.id === compartido.id);

  console.log('6) agregarMiembro(): el mismo usuario no puede ser miembro dos veces de la misma organización');
  let rechazadoDuplicado = false;
  try {
    await usuariosService.agregarMiembro(org.id, { email: 'due@vet.com', roles: ['capataz'] } as any);
  } catch (e: any) {
    rechazadoDuplicado = e?.status === 409 || e?.name === 'ConflictException';
  }
  check('rechaza con 409', rechazadoDuplicado);

  console.log('7) listarMiembros(): incluye a todos los que se fueron agregando, aislado por organización');
  const miembros = await usuariosService.listarMiembros(org.id);
  check('propietario + veterinario + el usuario compartido (no el de otraOrg)', miembros.length === 3);

  console.log('8) resetearPassword(): genera una temporal cuando no se especifica una');
  const [membresiaVet] = await db.select({ id: core.membresias.id }).from(core.membresias)
    .where(eq(core.membresias.usuarioId, altaVet.usuario.id));
  const reset = await usuariosService.resetearPassword(org.id, ['propietario'], altaVet.usuario.id, undefined);
  check('devuelve una contraseña temporal', reset.temporal === true && !!reset.password);
  check('sigue siendo miembro de la organización (búsqueda no rompió nada)', !!membresiaVet);

  console.log('9) actualizarRoles(): agregar un rol adicional a un miembro existente (sin tope en el plan)');
  const actualizado = await usuariosService.actualizarRoles(
    org.id, ['propietario'], altaVet.usuario.id, { roles: ['veterinario', 'capataz'] } as any,
  );
  check('devuelve los roles nuevos', actualizado.roles.includes('capataz') && actualizado.roles.includes('veterinario'));

  console.log('10) actualizarRoles(): un admin NO puede autopromoverse (ni promover a otro) a propietario');
  const altaAdmin = await usuariosService.agregarMiembro(org.id, {
    email: 'admin1@vet.com', password: 'password123', roles: ['admin'],
  } as any);
  let rechazaAutopromocion = false;
  try {
    await usuariosService.actualizarRoles(org.id, ['admin'], altaAdmin.usuario.id, { roles: ['admin', 'propietario'] } as any);
  } catch (e: any) {
    rechazaAutopromocion = e?.status === 403 || e?.name === 'ForbiddenException';
  }
  check('rechaza con 403', rechazaAutopromocion);

  console.log('11) actualizarRoles(): un propietario SÍ puede otorgar el rol de propietario');
  const promovido = await usuariosService.actualizarRoles(
    org.id, ['propietario'], altaAdmin.usuario.id, { roles: ['admin', 'propietario'] } as any,
  );
  check('ahora es propietario', promovido.roles.includes('propietario'));

  console.log('12) actualizarRoles(): protege al último propietario activo (mismo criterio que AdminService.setRoles)');
  await usuariosService.actualizarRoles(org.id, ['propietario'], propietario.id, { roles: ['capataz'] } as any);
  let rechazaUltimoPropietario = false;
  try {
    await usuariosService.actualizarRoles(org.id, ['propietario'], altaAdmin.usuario.id, { roles: ['admin'] } as any);
  } catch (e: any) {
    rechazaUltimoPropietario = e?.status === 400 || e?.name === 'BadRequestException';
  }
  check('no deja sacar al último propietario activo', rechazaUltimoPropietario);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
