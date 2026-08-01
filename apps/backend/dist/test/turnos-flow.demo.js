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
const ESTADOS_TERMINALES = new Set(['cancelado', 'atendido', 'ausente']);
async function main() {
    const client = new pglite_1.PGlite();
    await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA hce;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TYPE hce.estado_turno AS ENUM ('solicitado','confirmado','reprogramado','cancelado','atendido','ausente');
    CREATE TYPE core.sexo_persona AS ENUM ('masculino','femenino','otro');
    CREATE TABLE core.organizaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.personas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id), usuario_id uuid, dni text,
      nombre text NOT NULL, apellido text NOT NULL, sexo core.sexo_persona, fecha_nacimiento date,
      celular text, telefono text, email text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid REFERENCES core.personas(id), especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo', datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.turnos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid REFERENCES core.animales(id), persona_id uuid REFERENCES core.personas(id),
      veterinario_id uuid, fecha_hora timestamptz NOT NULL, estado hce.estado_turno NOT NULL DEFAULT 'solicitado',
      motivo text, canal text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);
    const db = (0, pglite_2.drizzle)(client, { schema: { organizaciones: core_1.organizaciones, personas: core_1.personas, especies: core_1.especies, animales: core_1.animales, turnos: hce_1.turnos } });
    const [orgA] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica A' }).returning();
    const [orgB] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica B' }).returning();
    const [duenio] = await db.insert(core_1.personas).values({ organizacionId: orgA.id, nombre: 'Juan', apellido: 'Pérez' }).returning();
    const [can] = await db.insert(core_1.especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
    const [firu] = await db.insert(core_1.animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais', personaId: duenio.id }).returning();
    async function solicitar(orgId, dto) {
        const [a] = await db.select({ id: core_1.animales.id, personaId: core_1.animales.personaId }).from(core_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.animales.id, dto.animalId), (0, drizzle_orm_1.eq)(core_1.animales.organizacionId, orgId))).limit(1);
        if (!a)
            throw new Error('El paciente no existe en esta organización');
        const [t] = await db.insert(hce_1.turnos).values({
            organizacionId: orgId, animalId: dto.animalId, personaId: a.personaId,
            fechaHora: new Date(dto.fechaHora), estado: 'solicitado', motivo: dto.motivo, canal: dto.canal ?? 'portal',
        }).returning();
        return t;
    }
    async function obtener(orgId, id) {
        const [t] = await db.select().from(hce_1.turnos).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(hce_1.turnos.id, id), (0, drizzle_orm_1.eq)(hce_1.turnos.organizacionId, orgId))).limit(1);
        if (!t)
            throw new Error('Turno no encontrado');
        return t;
    }
    async function cambiarEstado(orgId, id, dto) {
        const t = await obtener(orgId, id);
        if (ESTADOS_TERMINALES.has(t.estado))
            throw new Error(`estado terminal: ${t.estado}`);
        if (dto.estado === 'reprogramado' && !dto.fechaHora)
            throw new Error('falta fechaHora');
        const [u] = await db.update(hce_1.turnos).set({
            estado: dto.estado, fechaHora: dto.fechaHora ? new Date(dto.fechaHora) : t.fechaHora, updatedAt: new Date(),
        }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(hce_1.turnos.id, id), (0, drizzle_orm_1.eq)(hce_1.turnos.organizacionId, orgId))).returning();
        return u;
    }
    function agenda(orgId, desde, hasta) {
        const f = [(0, drizzle_orm_1.eq)(hce_1.turnos.organizacionId, orgId)];
        if (desde)
            f.push((0, drizzle_orm_1.gte)(hce_1.turnos.fechaHora, new Date(desde)));
        if (hasta)
            f.push((0, drizzle_orm_1.lte)(hce_1.turnos.fechaHora, new Date(hasta)));
        return db.select().from(hce_1.turnos).where((0, drizzle_orm_1.and)(...f)).orderBy((0, drizzle_orm_1.asc)(hce_1.turnos.fechaHora));
    }
    console.log('1) El dueño pide un turno (portal)');
    const t1 = await solicitar(orgA.id, { animalId: firu.id, fechaHora: '2024-09-10T10:00:00Z', motivo: 'Control' });
    check('se creó el turno', !!t1.id);
    check('estado inicial "solicitado"', t1.estado === 'solicitado');
    check('canal por defecto "portal"', t1.canal === 'portal');
    check('el solicitante se resolvió desde el dueño del animal', t1.personaId === duenio.id);
    console.log('2) La clínica gestiona el turno');
    const conf = await cambiarEstado(orgA.id, t1.id, { estado: 'confirmado' });
    check('pasa a "confirmado"', conf.estado === 'confirmado');
    const repro = await cambiarEstado(orgA.id, t1.id, { estado: 'reprogramado', fechaHora: '2024-09-12T15:30:00Z' });
    check('reprograma con nueva fecha', repro.estado === 'reprogramado' && new Date(repro.fechaHora).toISOString() === '2024-09-12T15:30:00.000Z');
    let faltaFecha = false;
    try {
        await cambiarEstado(orgA.id, t1.id, { estado: 'reprogramado' });
    }
    catch {
        faltaFecha = true;
    }
    check('reprogramar sin fecha es rechazado', faltaFecha);
    console.log('3) Estado terminal');
    await cambiarEstado(orgA.id, t1.id, { estado: 'atendido' });
    let terminal = false;
    try {
        await cambiarEstado(orgA.id, t1.id, { estado: 'cancelado' });
    }
    catch {
        terminal = true;
    }
    check('un turno atendido no admite más cambios', terminal);
    console.log('4) Agenda ordenada y por rango');
    await solicitar(orgA.id, { animalId: firu.id, fechaHora: '2024-09-05T09:00:00Z' });
    await solicitar(orgA.id, { animalId: firu.id, fechaHora: '2024-09-20T11:00:00Z' });
    const agendaFull = await agenda(orgA.id);
    check('la agenda está ordenada por fecha/hora', new Date(agendaFull[0].fechaHora).getTime() <= new Date(agendaFull[1].fechaHora).getTime());
    const rango = await agenda(orgA.id, '2024-09-01', '2024-09-11');
    check('el filtro por rango acota los turnos', rango.every((t) => new Date(t.fechaHora) <= new Date('2024-09-11')));
    console.log('5) Aislamiento entre clínicas');
    let cruzado = false;
    try {
        await solicitar(orgB.id, { animalId: firu.id, fechaHora: '2024-09-10T10:00:00Z' });
    }
    catch {
        cruzado = true;
    }
    check('otra clínica NO puede pedir turno para este paciente', cruzado);
    const agendaB = await agenda(orgB.id);
    check('la agenda de la Clínica B está vacía', agendaB.length === 0);
    console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
    await client.close();
    process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=turnos-flow.demo.js.map