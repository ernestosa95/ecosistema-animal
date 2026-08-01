/**
 * Integración: registro -> login -> verificación de token -> chequeo de tenant,
 * ejecutado contra un Postgres real (PGlite/WASM) usando el schema `core` real
 * y la MISMA lógica que apps/backend/src/core/auth/auth.service.ts.
 *
 * Correr:  pnpm --filter backend test:auth-demo   (o: npx tsx test/auth-flow.demo.ts)
 * No requiere Postgres instalado: PGlite levanta un Postgres embebido (WASM).
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { organizaciones, usuarios, membresias } from '../src/database/schema/core';

const SECRET = 'secreto-de-prueba';
let ok = 0, fail = 0;
function check(nombre: string, cond: boolean) {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ FALLA: ${nombre}`); }
}

// --- Setup: crear el schema core (subset necesario para el flujo de auth) ---
async function main() {
const client = new PGlite();
await client.exec(`
  CREATE SCHEMA core;
  CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
  CREATE TYPE core.rol_membresia AS ENUM ('propietario','admin','capataz','veterinario','recepcion');
  CREATE TABLE core.organizaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica',
    cuit text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );
  CREATE TABLE core.usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    nombre text, apellido text,
    email_verificado boolean NOT NULL DEFAULT false,
    ultimo_login timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );
  CREATE TABLE core.membresias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
    organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    rol core.rol_membresia NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE (usuario_id, organizacion_id)
  );
`);

const db = drizzle(client, { schema: { organizaciones, usuarios, membresias } });

// ============ Lógica replicada de AuthService (misma que el backend) ============
async function register(dto: {
  email: string; password: string; nombre: string; apellido: string; nombreOrganizacion: string;
}) {
  const existe = await db.select({ id: usuarios.id }).from(usuarios)
    .where(eq(usuarios.email, dto.email)).limit(1);
  if (existe.length) throw new Error('El email ya está registrado');

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const { user } = await db.transaction(async (tx) => {
    const [org] = await tx.insert(organizaciones)
      .values({ nombre: dto.nombreOrganizacion, tipo: 'clinica' }).returning();
    const [u] = await tx.insert(usuarios)
      .values({ email: dto.email, passwordHash, nombre: dto.nombre, apellido: dto.apellido }).returning();
    await tx.insert(membresias)
      .values({ usuarioId: u.id, organizacionId: org.id, rol: 'propietario' });
    return { user: u, org };
  });
  return { accessToken: jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: '15m' }) };
}

async function login(dto: { email: string; password: string }) {
  const [user] = await db.select().from(usuarios).where(eq(usuarios.email, dto.email)).limit(1);
  if (!user) throw new Error('Credenciales inválidas');
  const okPass = await bcrypt.compare(dto.password, user.passwordHash);
  if (!okPass) throw new Error('Credenciales inválidas');
  const orgs = await db.select({ organizacionId: membresias.organizacionId, rol: membresias.rol })
    .from(membresias).where(eq(membresias.usuarioId, user.id));
  return { accessToken: jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: '15m' }), organizaciones: orgs };
}

// ============================== Pruebas ==============================
console.log('1) Registro');
const reg = await register({
  email: 'vet@clinica.com', password: 'unaClaveSegura',
  nombre: 'Ana', apellido: 'Vet', nombreOrganizacion: 'Clínica del Sur',
});
check('devuelve accessToken', typeof reg.accessToken === 'string' && reg.accessToken.length > 20);

const usuariosCreados = await db.select().from(usuarios);
check('el usuario quedó en la base', usuariosCreados.length === 1);
check('la contraseña se guardó hasheada (no en claro)',
  usuariosCreados[0].passwordHash !== 'unaClaveSegura' && usuariosCreados[0].passwordHash.startsWith('$2'));

const membresiasCreadas = await db.select().from(membresias);
check('se creó la membresía como propietario', membresiasCreadas[0]?.rol === 'propietario');

console.log('2) Email duplicado');
let rechazoDuplicado = false;
try { await register({ email: 'vet@clinica.com', password: 'otraClave123', nombre: 'X', apellido: 'Y', nombreOrganizacion: 'Otra' }); }
catch { rechazoDuplicado = true; }
check('rechaza registrar el mismo email dos veces', rechazoDuplicado);

console.log('3) Login correcto');
const log = await login({ email: 'vet@clinica.com', password: 'unaClaveSegura' });
check('login devuelve token', typeof log.accessToken === 'string');
check('login devuelve las organizaciones del usuario', log.organizaciones.length === 1);

console.log('4) Login con clave incorrecta');
let rechazoClave = false;
try { await login({ email: 'vet@clinica.com', password: 'claveEquivocada' }); }
catch { rechazoClave = true; }
check('rechaza contraseña incorrecta', rechazoClave);

console.log('5) Verificación del token (JwtAuthGuard)');
const payload = jwt.verify(log.accessToken, SECRET) as any;
check('el token verifica y trae el sub (userId)', !!payload.sub);
check('el token trae el email', payload.email === 'vet@clinica.com');
let rechazoTokenMalo = false;
try { jwt.verify(log.accessToken, 'secreto-incorrecto'); } catch { rechazoTokenMalo = true; }
check('rechaza un token firmado con otro secreto', rechazoTokenMalo);

console.log('6) Chequeo de tenant (TenantGuard)');
const orgId = log.organizaciones[0].organizacionId;
const [m] = await db.select({ rol: membresias.rol }).from(membresias)
  .where(and(eq(membresias.usuarioId, payload.sub), eq(membresias.organizacionId, orgId), eq(membresias.activo, true)))
  .limit(1);
check('el usuario tiene membresía activa en su organización', m?.rol === 'propietario');

const idInexistente = '00000000-0000-0000-0000-000000000000';
const ajeno = await db.select().from(membresias)
  .where(and(eq(membresias.usuarioId, payload.sub), eq(membresias.organizacionId, idInexistente)))
  .limit(1);
check('NO tiene acceso a una organización ajena', ajeno.length === 0);

console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
await client.close();
process.exit(fail === 0 ? 0 : 1);

}

main().catch((e) => { console.error(e); process.exit(1); });
