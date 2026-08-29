/**
 * Prueba del control de acceso por vencimiento (TenantGuard) y de los
 * mensajes de plataforma dirigidos por organización/grupo (MensajesService),
 * contra un Postgres real (PGlite/WASM). Mismo estilo que sync-flow.demo.ts.
 *
 * Correr: pnpm --filter backend test:plataforma-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as core from '../src/database/schema/core';
import * as plataforma from '../src/database/schema/plataforma';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { MensajesService } from '../src/mensajes/mensajes.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

function fakeContext(user: { sub: string }, headers: Record<string, string>) {
  const req: any = { user, headers };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA plataforma;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.rol_membresia AS ENUM ('propietario','admin','capataz','veterinario','recepcion');

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
    CREATE TABLE core.membresias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      rol core.rol_membresia[] NOT NULL, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);

    CREATE TABLE plataforma.grupos_organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL, descripcion text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE plataforma.mensajes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titulo text NOT NULL, cuerpo text NOT NULL,
      destinatario_tipo text NOT NULL,
      organizacion_id uuid REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      grupo_id uuid REFERENCES plataforma.grupos_organizaciones(id) ON DELETE CASCADE,
      creado_por uuid REFERENCES core.usuarios(id),
      publicado_en timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE plataforma.mensajes_leidos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mensaje_id uuid NOT NULL REFERENCES plataforma.mensajes(id) ON DELETE CASCADE,
      usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
      leido_en timestamptz NOT NULL DEFAULT now());
  `);

  const db = drizzle(client, { schema: { ...core, ...plataforma } });

  // Seed
  const [grupoCadenas] = await db.insert(plataforma.gruposOrganizaciones).values({ nombre: 'Cadena de veterinarias' }).returning();
  const [orgConGrupo] = await db.insert(core.organizaciones).values({ nombre: 'Vet A', grupoId: grupoCadenas.id }).returning();
  const [orgSinGrupo] = await db.insert(core.organizaciones).values({ nombre: 'Vet B (unipersonal)' }).returning();
  const [orgVencida] = await db.insert(core.organizaciones).values({
    nombre: 'Vet C (demo vencida)', accesoHasta: new Date(Date.now() - 24 * 60 * 60 * 1000),
  }).returning();
  const [usuarioA] = await db.insert(core.usuarios).values({ email: 'a@vet.com', passwordHash: 'x' }).returning();
  const [usuarioB] = await db.insert(core.usuarios).values({ email: 'b@vet.com', passwordHash: 'x' }).returning();
  const [usuarioC] = await db.insert(core.usuarios).values({ email: 'c@vet.com', passwordHash: 'x' }).returning();
  await db.insert(core.membresias).values({ usuarioId: usuarioA.id, organizacionId: orgConGrupo.id, roles: ['propietario'] });
  await db.insert(core.membresias).values({ usuarioId: usuarioB.id, organizacionId: orgSinGrupo.id, roles: ['propietario'] });
  await db.insert(core.membresias).values({ usuarioId: usuarioC.id, organizacionId: orgVencida.id, roles: ['propietario'] });

  console.log('1) TenantGuard: organización sin accesoHasta (null) no se ve afectada');
  const guard = new TenantGuard(db as any);
  const ctxA = fakeContext({ sub: usuarioA.id }, { 'x-organizacion-id': orgConGrupo.id });
  let paso = false;
  try { paso = await guard.canActivate(ctxA); } catch { paso = false; }
  check('org sin accesoHasta deja pasar', paso === true);

  console.log('2) TenantGuard: accesoHasta vencido rechaza con 403');
  const ctxC = fakeContext({ sub: usuarioC.id }, { 'x-organizacion-id': orgVencida.id });
  let rechazado = false;
  try { await guard.canActivate(ctxC); } catch (e: any) { rechazado = e?.status === 403 || e?.name === 'ForbiddenException'; }
  check('org con accesoHasta vencido se rechaza', rechazado);

  console.log('3) Mensajes: dirigido a un grupo aparece para un usuario de una org de ese grupo');
  const mensajesService = new MensajesService(db as any);
  await db.insert(plataforma.mensajes).values({
    titulo: 'Aumento de precio', cuerpo: 'El mes que viene sube el precio.',
    destinatarioTipo: 'grupo', grupoId: grupoCadenas.id, creadoPor: usuarioA.id,
  });
  const pendientesA = await mensajesService.pendientes(orgConGrupo.id, usuarioA.id);
  check('el usuario de la org del grupo ve el mensaje', pendientesA.length === 1);

  console.log('4) Mensajes: NO aparece para un usuario de una org fuera de ese grupo');
  const pendientesB = await mensajesService.pendientes(orgSinGrupo.id, usuarioB.id);
  check('el usuario de otra org no ve el mensaje del grupo', pendientesB.length === 0);

  console.log('5) Mensajes: marcar como leído lo saca de "pendientes" (idempotente)');
  await mensajesService.marcarLeido(pendientesA[0].id, usuarioA.id);
  await mensajesService.marcarLeido(pendientesA[0].id, usuarioA.id); // reintento, no debe duplicar/romper
  const pendientesADespues = await mensajesService.pendientes(orgConGrupo.id, usuarioA.id);
  check('ya no aparece como pendiente tras marcarlo leído', pendientesADespues.length === 0);

  console.log('6) Mensajes: broadcast "todas" aparece para cualquier organización');
  await db.insert(plataforma.mensajes).values({
    titulo: 'Nueva funcionalidad', cuerpo: 'Probaste el dashboard nuevo?',
    destinatarioTipo: 'todas', creadoPor: usuarioA.id,
  });
  const pendientesBTodas = await mensajesService.pendientes(orgSinGrupo.id, usuarioB.id);
  check('el broadcast "todas" llega a una org sin grupo', pendientesBTodas.length === 1);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
