/**
 * Prueba de roles apilables (membresias.roles como arreglo) contra un
 * Postgres real (PGlite/WASM): TenantGuard resuelve el arreglo completo,
 * RolesGuard deja pasar si CUALQUIERA de los roles del usuario coincide con
 * los requeridos por @Roles().
 *
 * Correr: pnpm --filter backend test:roles-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as core from '../src/database/schema/core';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

function fakeTenantContext(user: { sub: string }, headers: Record<string, string>) {
  const req: any = { user, headers };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}

function fakeRolesContext(roles: string[], requeridos: string[]) {
  const req: any = { roles };
  const reflector = {
    getAllAndOverride: () => requeridos,
  } as unknown as Reflector;
  const ctx = { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => null, getClass: () => null } as any;
  return { ctx, reflector };
}

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE TYPE core.rol_membresia AS ENUM ('propietario','admin','capataz','veterinario','recepcion');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.membresias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      rol core.rol_membresia[] NOT NULL, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { ...core } });

  const [org] = await db.insert(core.organizaciones).values({ nombre: 'Clínica Apilada' }).returning();
  const [usuarioViejo] = await db.insert(core.usuarios).values({ email: 'viejo@vet.com', passwordHash: 'x' }).returning();
  const [usuarioApilado] = await db.insert(core.usuarios).values({ email: 'apilado@vet.com', passwordHash: 'x' }).returning();

  // Simula el backfill de la migración 0006: una membresía preexistente con
  // un solo rol queda como arreglo de 1 elemento.
  await db.insert(core.membresias).values({ usuarioId: usuarioViejo.id, organizacionId: org.id, roles: ['propietario'] });
  await db.insert(core.membresias).values({ usuarioId: usuarioApilado.id, organizacionId: org.id, roles: ['recepcion', 'veterinario'] });

  console.log('1) TenantGuard resuelve req.roles como arreglo completo');
  const guard = new TenantGuard(db as any);
  const ctx = fakeTenantContext({ sub: usuarioApilado.id }, { 'x-organizacion-id': org.id });
  const pasoTenant = await guard.canActivate(ctx);
  check('TenantGuard deja pasar', pasoTenant === true);
  check('req.roles trae los dos roles apilados', JSON.stringify(ctx._req.roles.sort()) === JSON.stringify(['recepcion', 'veterinario']));

  console.log('2) RolesGuard: alcanza con que UNO de los roles coincida');

  const { ctx: ctxVet, reflector: reflVet } = fakeRolesContext(['recepcion', 'veterinario'], ['veterinario']);
  const guardVet = new RolesGuard(reflVet);
  check('pasa un endpoint que exige "veterinario"', guardVet.canActivate(ctxVet) === true);

  const { ctx: ctxRecepcion, reflector: reflRecepcion } = fakeRolesContext(['recepcion', 'veterinario'], ['recepcion']);
  const guardRecepcion = new RolesGuard(reflRecepcion);
  check('pasa un endpoint que exige "recepcion"', guardRecepcion.canActivate(ctxRecepcion) === true);

  const { ctx: ctxProp, reflector: reflProp } = fakeRolesContext(['recepcion', 'veterinario'], ['propietario']);
  const guardProp = new RolesGuard(reflProp);
  let rechazado = false;
  try { guardProp.canActivate(ctxProp); } catch { rechazado = true; }
  check('NO pasa un endpoint que exige "propietario" (no lo tiene)', rechazado);

  console.log('3) Membresía preexistente (un solo rol, vía backfill) sigue funcionando');
  const [mViejo] = await db.select({ roles: core.membresias.roles }).from(core.membresias)
    .where(eq(core.membresias.usuarioId, usuarioViejo.id)).limit(1);
  check('quedó como arreglo de 1 elemento', mViejo.roles.length === 1 && mViejo.roles[0] === 'propietario');

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
