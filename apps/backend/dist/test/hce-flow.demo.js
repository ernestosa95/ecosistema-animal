"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pglite_1 = require("@electric-sql/pglite");
const pglite_2 = require("drizzle-orm/pglite");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("../src/database/schema/core");
const hce_1 = require("../src/database/schema/hce");
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
    CREATE SCHEMA hce;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.personas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id),
      nombre text NOT NULL, apellido text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
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
    CREATE TABLE hce.consultas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id),
      veterinario_id uuid REFERENCES core.usuarios(id),
      fecha timestamptz NOT NULL DEFAULT now(),
      motivo text, anamnesis text, examen_fisico text, diagnostico text, tratamiento text,
      peso_kg numeric(6,2), temperatura_c numeric(4,1), observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
  `);
    const db = (0, pglite_2.drizzle)(client, { schema: { organizaciones: core_1.organizaciones, usuarios: core_1.usuarios, especies: core_1.especies, animales: core_1.animales, consultas: hce_1.consultas } });
    const [orgA] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica A' }).returning();
    const [orgB] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica B' }).returning();
    const [vet] = await db.insert(core_1.usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana' }).returning();
    const [can] = await db.insert(core_1.especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
    const [firulais] = await db.insert(core_1.animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais' }).returning();
    async function verificarAnimal(orgId, animalId) {
        const [a] = await db.select({ id: core_1.animales.id }).from(core_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.animales.id, animalId), (0, drizzle_orm_1.eq)(core_1.animales.organizacionId, orgId))).limit(1);
        if (!a)
            throw new Error('El paciente no existe en esta organización');
    }
    async function crear(orgId, vetId, dto) {
        await verificarAnimal(orgId, dto.animalId);
        const [c] = await db.insert(hce_1.consultas).values({
            organizacionId: orgId, animalId: dto.animalId, veterinarioId: vetId,
            fecha: dto.fecha ? new Date(dto.fecha) : undefined,
            motivo: dto.motivo, diagnostico: dto.diagnostico, tratamiento: dto.tratamiento,
            pesoKg: dto.pesoKg?.toString(), observaciones: dto.observaciones,
        }).returning();
        return c;
    }
    async function historiaPorAnimal(orgId, animalId) {
        await verificarAnimal(orgId, animalId);
        return db.select().from(hce_1.consultas)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(hce_1.consultas.organizacionId, orgId), (0, drizzle_orm_1.eq)(hce_1.consultas.animalId, animalId)))
            .orderBy((0, drizzle_orm_1.desc)(hce_1.consultas.fecha));
    }
    console.log('1) Registrar una consulta');
    const c1 = await crear(orgA.id, vet.id, {
        animalId: firulais.id, fecha: '2024-01-15', motivo: 'Control anual',
        diagnostico: 'Sano', tratamiento: 'Vacuna séxtuple', pesoKg: 28.5,
    });
    check('se creó la consulta', !!c1.id);
    check('quedó en la organización correcta', c1.organizacionId === orgA.id);
    check('registró al veterinario', c1.veterinarioId === vet.id);
    check('guardó el diagnóstico', c1.diagnostico === 'Sano');
    check('guardó el peso (numeric)', Number(c1.pesoKg) === 28.5);
    console.log('2) Historia clínica ordenada');
    await crear(orgA.id, vet.id, { animalId: firulais.id, fecha: '2024-06-20', motivo: 'Otitis', diagnostico: 'Otitis externa' });
    const historia = await historiaPorAnimal(orgA.id, firulais.id);
    check('la historia tiene 2 consultas', historia.length === 2);
    check('la más reciente aparece primera', historia[0].motivo === 'Otitis');
    console.log('3) Aislamiento entre clínicas');
    let rechazoCruzado = false;
    try {
        await crear(orgB.id, vet.id, { animalId: firulais.id, motivo: 'Intruso' });
    }
    catch {
        rechazoCruzado = true;
    }
    check('otra clínica NO puede cargar consultas a este paciente', rechazoCruzado);
    const ajeno = await db.select().from(hce_1.consultas)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(hce_1.consultas.id, c1.id), (0, drizzle_orm_1.eq)(hce_1.consultas.organizacionId, orgB.id))).limit(1);
    check('obtener() con otra organización no la encuentra', ajeno.length === 0);
    console.log('4) Paciente inexistente');
    let rechazoAnimal = false;
    try {
        await crear(orgA.id, vet.id, { animalId: '00000000-0000-0000-0000-000000000000', motivo: 'X' });
    }
    catch {
        rechazoAnimal = true;
    }
    check('rechaza consulta sobre un paciente inexistente', rechazoAnimal);
    console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
    await client.close();
    process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=hce-flow.demo.js.map