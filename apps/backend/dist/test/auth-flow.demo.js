"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pglite_1 = require("@electric-sql/pglite");
const pglite_2 = require("drizzle-orm/pglite");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const core_1 = require("../src/database/schema/core");
const SECRET = 'secreto-de-prueba';
let ok = 0, fail = 0;
function check(nombre, cond) {
    if (cond) {
        ok++;
        console.log(`  ✓ ${nombre}`);
    }
    else {
        fail++;
        console.log(`  ✗ FALLA: ${nombre}`);
    }
}
async function main() {
    const client = new pglite_1.PGlite();
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
    const db = (0, pglite_2.drizzle)(client, { schema: { organizaciones: core_1.organizaciones, usuarios: core_1.usuarios, membresias: core_1.membresias } });
    async function register(dto) {
        const existe = await db.select({ id: core_1.usuarios.id }).from(core_1.usuarios)
            .where((0, drizzle_orm_1.eq)(core_1.usuarios.email, dto.email)).limit(1);
        if (existe.length)
            throw new Error('El email ya está registrado');
        const passwordHash = await bcryptjs_1.default.hash(dto.password, 10);
        const { user } = await db.transaction(async (tx) => {
            const [org] = await tx.insert(core_1.organizaciones)
                .values({ nombre: dto.nombreOrganizacion, tipo: 'clinica' }).returning();
            const [u] = await tx.insert(core_1.usuarios)
                .values({ email: dto.email, passwordHash, nombre: dto.nombre, apellido: dto.apellido }).returning();
            await tx.insert(core_1.membresias)
                .values({ usuarioId: u.id, organizacionId: org.id, rol: 'propietario' });
            return { user: u, org };
        });
        return { accessToken: jsonwebtoken_1.default.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: '15m' }) };
    }
    async function login(dto) {
        const [user] = await db.select().from(core_1.usuarios).where((0, drizzle_orm_1.eq)(core_1.usuarios.email, dto.email)).limit(1);
        if (!user)
            throw new Error('Credenciales inválidas');
        const okPass = await bcryptjs_1.default.compare(dto.password, user.passwordHash);
        if (!okPass)
            throw new Error('Credenciales inválidas');
        const orgs = await db.select({ organizacionId: core_1.membresias.organizacionId, rol: core_1.membresias.rol })
            .from(core_1.membresias).where((0, drizzle_orm_1.eq)(core_1.membresias.usuarioId, user.id));
        return { accessToken: jsonwebtoken_1.default.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: '15m' }), organizaciones: orgs };
    }
    console.log('1) Registro');
    const reg = await register({
        email: 'vet@clinica.com', password: 'unaClaveSegura',
        nombre: 'Ana', apellido: 'Vet', nombreOrganizacion: 'Clínica del Sur',
    });
    check('devuelve accessToken', typeof reg.accessToken === 'string' && reg.accessToken.length > 20);
    const usuariosCreados = await db.select().from(core_1.usuarios);
    check('el usuario quedó en la base', usuariosCreados.length === 1);
    check('la contraseña se guardó hasheada (no en claro)', usuariosCreados[0].passwordHash !== 'unaClaveSegura' && usuariosCreados[0].passwordHash.startsWith('$2'));
    const membresiasCreadas = await db.select().from(core_1.membresias);
    check('se creó la membresía como propietario', membresiasCreadas[0]?.rol === 'propietario');
    console.log('2) Email duplicado');
    let rechazoDuplicado = false;
    try {
        await register({ email: 'vet@clinica.com', password: 'otraClave123', nombre: 'X', apellido: 'Y', nombreOrganizacion: 'Otra' });
    }
    catch {
        rechazoDuplicado = true;
    }
    check('rechaza registrar el mismo email dos veces', rechazoDuplicado);
    console.log('3) Login correcto');
    const log = await login({ email: 'vet@clinica.com', password: 'unaClaveSegura' });
    check('login devuelve token', typeof log.accessToken === 'string');
    check('login devuelve las organizaciones del usuario', log.organizaciones.length === 1);
    console.log('4) Login con clave incorrecta');
    let rechazoClave = false;
    try {
        await login({ email: 'vet@clinica.com', password: 'claveEquivocada' });
    }
    catch {
        rechazoClave = true;
    }
    check('rechaza contraseña incorrecta', rechazoClave);
    console.log('5) Verificación del token (JwtAuthGuard)');
    const payload = jsonwebtoken_1.default.verify(log.accessToken, SECRET);
    check('el token verifica y trae el sub (userId)', !!payload.sub);
    check('el token trae el email', payload.email === 'vet@clinica.com');
    let rechazoTokenMalo = false;
    try {
        jsonwebtoken_1.default.verify(log.accessToken, 'secreto-incorrecto');
    }
    catch {
        rechazoTokenMalo = true;
    }
    check('rechaza un token firmado con otro secreto', rechazoTokenMalo);
    console.log('6) Chequeo de tenant (TenantGuard)');
    const orgId = log.organizaciones[0].organizacionId;
    const [m] = await db.select({ rol: core_1.membresias.rol }).from(core_1.membresias)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.membresias.usuarioId, payload.sub), (0, drizzle_orm_1.eq)(core_1.membresias.organizacionId, orgId), (0, drizzle_orm_1.eq)(core_1.membresias.activo, true)))
        .limit(1);
    check('el usuario tiene membresía activa en su organización', m?.rol === 'propietario');
    const idInexistente = '00000000-0000-0000-0000-000000000000';
    const ajeno = await db.select().from(core_1.membresias)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.membresias.usuarioId, payload.sub), (0, drizzle_orm_1.eq)(core_1.membresias.organizacionId, idInexistente)))
        .limit(1);
    check('NO tiene acceso a una organización ajena', ajeno.length === 0);
    console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
    await client.close();
    process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=auth-flow.demo.js.map