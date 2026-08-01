"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pglite_1 = require("@electric-sql/pglite");
const pglite_2 = require("drizzle-orm/pglite");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("../src/database/schema/core");
const codigo_legible_util_1 = require("../src/core/animales/codigo-legible.util");
let ok = 0, fail = 0;
function check(n, c) {
    if (c) {
        ok++;
        console.log(`  ✓ ${n}`);
    }
    else {
        fail++;
        console.log(`  ✗ FALLA: ${n}`);
    }
}
async function main() {
    const client = new pglite_1.PGlite();
    await client.exec(`
  CREATE SCHEMA core;
  CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
  CREATE TYPE core.sexo_persona AS ENUM ('masculino','femenino','otro');
  CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
  CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
  CREATE SEQUENCE core.animales_codigo_seq START 1;
  CREATE TABLE core.organizaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
    tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
  );
  CREATE TABLE core.personas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    usuario_id uuid, dni text, nombre text NOT NULL, apellido text NOT NULL,
    sexo core.sexo_persona, fecha_nacimiento date, celular text, telefono text, email text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
    UNIQUE (organizacion_id, dni)
  );
  CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
  CREATE TABLE core.animales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    persona_id uuid REFERENCES core.personas(id),
    especie_id uuid NOT NULL REFERENCES core.especies(id),
    codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
    sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
    foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo',
    datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
  );
`);
    const db = (0, pglite_2.drizzle)(client, { schema: { organizaciones: core_1.organizaciones, personas: core_1.personas, especies: core_1.especies, animales: core_1.animales } });
    const [orgA] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica A' }).returning();
    const [orgB] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica B' }).returning();
    const [can] = await db.insert(core_1.especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
    async function crearPersona(orgId, dto) {
        if (dto.dni) {
            const [ex] = await db.select({ id: core_1.personas.id }).from(core_1.personas)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.personas.organizacionId, orgId), (0, drizzle_orm_1.eq)(core_1.personas.dni, dto.dni))).limit(1);
            if (ex)
                throw new Error('DNI duplicado en la organización');
        }
        const [p] = await db.insert(core_1.personas).values({
            organizacionId: orgId, dni: dto.dni, nombre: dto.nombre, apellido: dto.apellido,
            sexo: dto.sexo, celular: dto.celular, email: dto.email,
        }).returning();
        return p;
    }
    async function crearAnimal(orgId, dto) {
        const [esp] = await db.select({ codigo: core_1.especies.codigo }).from(core_1.especies)
            .where((0, drizzle_orm_1.eq)(core_1.especies.id, dto.especieId)).limit(1);
        if (!esp)
            throw new Error('especie inexistente');
        if (dto.personaId) {
            const [d] = await db.select({ id: core_1.personas.id }).from(core_1.personas)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.personas.id, dto.personaId), (0, drizzle_orm_1.eq)(core_1.personas.organizacionId, orgId))).limit(1);
            if (!d)
                throw new Error('El dueño no pertenece a esta organización');
        }
        const r = await client.query("SELECT nextval('core.animales_codigo_seq') AS n");
        const [a] = await db.insert(core_1.animales).values({
            organizacionId: orgId, especieId: dto.especieId, personaId: dto.personaId,
            nombre: dto.nombre, codigoLegible: (0, codigo_legible_util_1.generarCodigoLegible)(esp.codigo, Number(r.rows[0].n)),
        }).returning();
        return a;
    }
    console.log('1) Alta de dueño');
    const juan = await crearPersona(orgA.id, {
        dni: '30111222', nombre: 'Juan', apellido: 'Pérez', sexo: 'masculino',
        celular: '11-5555-0000', email: 'juan@mail.com',
    });
    check('se creó la persona', !!juan.id);
    check('quedó en la organización correcta', juan.organizacionId === orgA.id);
    console.log('2) DNI único por organización');
    let dup = false;
    try {
        await crearPersona(orgA.id, { dni: '30111222', nombre: 'Otro', apellido: 'Juan' });
    }
    catch {
        dup = true;
    }
    check('rechaza DNI duplicado en la misma clínica', dup);
    const juanEnB = await crearPersona(orgB.id, { dni: '30111222', nombre: 'Juan', apellido: 'Homónimo' });
    check('permite el mismo DNI en otra clínica (aislamiento)', juanEnB.organizacionId === orgB.id);
    console.log('3) Aislamiento entre clínicas');
    const enA = await db.select().from(core_1.personas).where((0, drizzle_orm_1.eq)(core_1.personas.organizacionId, orgA.id));
    const bVeA = enA.some((p) => p.id === juanEnB.id);
    check('la Clínica B no aparece en el listado de A', !bVeA);
    const ajeno = await db.select().from(core_1.personas)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.personas.id, juan.id), (0, drizzle_orm_1.eq)(core_1.personas.organizacionId, orgB.id))).limit(1);
    check('obtener() con otra organización no lo encuentra', ajeno.length === 0);
    console.log('4) Asociar animal a su dueño');
    const firulais = await crearAnimal(orgA.id, { nombre: 'Firulais', especieId: can.id, personaId: juan.id });
    check('el animal quedó asociado al dueño', firulais.personaId === juan.id);
    const animalesDeJuan = await db.select().from(core_1.animales)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.animales.organizacionId, orgA.id), (0, drizzle_orm_1.eq)(core_1.animales.personaId, juan.id)));
    check('listarAnimales del dueño devuelve su animal', animalesDeJuan.length === 1);
    console.log('5) Protección cruzada: dueño de otra clínica');
    let cruzado = false;
    try {
        await crearAnimal(orgB.id, { nombre: 'Intruso', especieId: can.id, personaId: juan.id });
    }
    catch {
        cruzado = true;
    }
    check('rechaza asociar un dueño de otra organización', cruzado);
    console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
    await client.close();
    process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=personas-flow.demo.js.map