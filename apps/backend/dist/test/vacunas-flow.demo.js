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
const iso = (offsetDias) => new Date(Date.now() + offsetDias * 86400000).toISOString().slice(0, 10);
async function main() {
    const client = new pglite_1.PGlite();
    await client.exec(`
    CREATE SCHEMA core; CREATE SCHEMA hce;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TABLE core.organizaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.personas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id), nombre text NOT NULL, apellido text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      persona_id uuid REFERENCES core.personas(id), especie_id uuid NOT NULL REFERENCES core.especies(id),
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo', datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE hce.vacunaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id),
      veterinario_id uuid REFERENCES core.usuarios(id),
      producto text, vademecum_id uuid, fecha date NOT NULL DEFAULT current_date, proxima_dosis date, lote_producto text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);
    const db = (0, pglite_2.drizzle)(client, { schema: { organizaciones: core_1.organizaciones, usuarios: core_1.usuarios, especies: core_1.especies, animales: core_1.animales, vacunaciones: hce_1.vacunaciones } });
    const [orgA] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica A' }).returning();
    const [orgB] = await db.insert(core_1.organizaciones).values({ nombre: 'Clínica B' }).returning();
    const [vet] = await db.insert(core_1.usuarios).values({ email: 'vet@a.com', passwordHash: 'x', nombre: 'Ana' }).returning();
    const [can] = await db.insert(core_1.especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
    const [firu] = await db.insert(core_1.animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais', codigoLegible: 'CAN-AR-000001-W' }).returning();
    async function verificarAnimal(orgId, animalId) {
        const [a] = await db.select({ id: core_1.animales.id }).from(core_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(core_1.animales.id, animalId), (0, drizzle_orm_1.eq)(core_1.animales.organizacionId, orgId))).limit(1);
        if (!a)
            throw new Error('El paciente no existe en esta organización');
    }
    async function registrar(orgId, vetId, dto) {
        await verificarAnimal(orgId, dto.animalId);
        const [v] = await db.insert(hce_1.vacunaciones).values({
            organizacionId: orgId, animalId: dto.animalId, veterinarioId: vetId,
            producto: dto.producto, fecha: dto.fecha, proximaDosis: dto.proximaDosis, loteProducto: dto.loteProducto,
        }).returning();
        return v;
    }
    async function recordatorios(orgId, dias = 30) {
        return db.select({
            id: hce_1.vacunaciones.id, animalId: hce_1.vacunaciones.animalId,
            animalNombre: core_1.animales.nombre, producto: hce_1.vacunaciones.producto, proximaDosis: hce_1.vacunaciones.proximaDosis,
        }).from(hce_1.vacunaciones).innerJoin(core_1.animales, (0, drizzle_orm_1.eq)(core_1.animales.id, hce_1.vacunaciones.animalId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(hce_1.vacunaciones.organizacionId, orgId), (0, drizzle_orm_1.isNull)(hce_1.vacunaciones.deletedAt), (0, drizzle_orm_1.isNotNull)(hce_1.vacunaciones.proximaDosis), (0, drizzle_orm_1.sql) `${hce_1.vacunaciones.proximaDosis} <= current_date + ${dias}::int`))
            .orderBy((0, drizzle_orm_1.asc)(hce_1.vacunaciones.proximaDosis));
    }
    console.log('1) Registrar vacunación');
    const v1 = await registrar(orgA.id, vet.id, {
        animalId: firu.id, producto: 'Séxtuple', fecha: iso(-2), proximaDosis: iso(10), loteProducto: 'L-2024-A',
    });
    check('se registró la vacunación', !!v1.id);
    check('quedó en la organización correcta', v1.organizacionId === orgA.id);
    check('registró al veterinario', v1.veterinarioId === vet.id);
    check('guardó la próxima dosis', v1.proximaDosis === iso(10));
    await registrar(orgA.id, vet.id, { animalId: firu.id, producto: 'Antirrábica', fecha: iso(-1), proximaDosis: iso(200) });
    console.log('2) Recordatorios de próxima dosis');
    const rec30 = await recordatorios(orgA.id, 30);
    check('recordatorios(30) trae solo la dosis próxima', rec30.length === 1);
    check('el recordatorio corresponde a la Séxtuple', rec30[0].producto === 'Séxtuple');
    check('el recordatorio incluye el nombre del paciente (join)', rec30[0].animalNombre === 'Firulais');
    const rec365 = await recordatorios(orgA.id, 365);
    check('recordatorios(365) trae ambas', rec365.length === 2);
    console.log('3) Aislamiento entre clínicas');
    let cruzado = false;
    try {
        await registrar(orgB.id, vet.id, { animalId: firu.id, producto: 'X' });
    }
    catch {
        cruzado = true;
    }
    check('otra clínica NO puede vacunar a este paciente', cruzado);
    const recB = await recordatorios(orgB.id, 365);
    check('los recordatorios de la Clínica B están vacíos', recB.length === 0);
    console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
    await client.close();
    process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=vacunas-flow.demo.js.map