"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_provider_1 = require("../../database/drizzle.provider");
const schema_1 = require("../../database/schema");
const codigo_legible_util_1 = require("./codigo-legible.util");
let AnimalesService = class AnimalesService {
    constructor(db) {
        this.db = db;
    }
    async crear(organizacionId, dto) {
        const [especie] = await this.db
            .select({ codigo: schema_1.especies.codigo })
            .from(schema_1.especies)
            .where((0, drizzle_orm_1.eq)(schema_1.especies.id, dto.especieId))
            .limit(1);
        if (!especie) {
            throw new common_1.BadRequestException('La especie indicada no existe');
        }
        if (dto.microchip && !(0, codigo_legible_util_1.validarMicrochipISO)(dto.microchip)) {
            throw new common_1.BadRequestException('El microchip no cumple el formato ISO (15 dígitos)');
        }
        if (dto.personaId) {
            const [dueno] = await this.db
                .select({ id: schema_1.personas.id })
                .from(schema_1.personas)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.personas.id, dto.personaId), (0, drizzle_orm_1.eq)(schema_1.personas.organizacionId, organizacionId)))
                .limit(1);
            if (!dueno) {
                throw new common_1.BadRequestException('El dueño indicado no existe en esta organización');
            }
        }
        const seqRes = await this.db.execute((0, drizzle_orm_1.sql) `SELECT nextval('core.animales_codigo_seq') AS n`);
        const secuencia = Number(seqRes.rows[0].n);
        const codigoLegible = (0, codigo_legible_util_1.generarCodigoLegible)(especie.codigo, secuencia);
        const [animal] = await this.db
            .insert(schema_1.animales)
            .values({
            organizacionId,
            especieId: dto.especieId,
            personaId: dto.personaId,
            nombre: dto.nombre,
            sexo: dto.sexo,
            fechaNacimiento: dto.fechaNacimiento,
            fechaNacEstimada: dto.fechaNacEstimada ?? false,
            fotoUrl: dto.fotoUrl,
            microchip: dto.microchip,
            codigoLegible,
            datosEspecificos: dto.datosEspecificos ?? {},
        })
            .returning();
        return animal;
    }
    listar(organizacionId) {
        return this.db
            .select()
            .from(schema_1.animales)
            .where((0, drizzle_orm_1.eq)(schema_1.animales.organizacionId, organizacionId));
    }
    async obtener(organizacionId, id) {
        const [animal] = await this.db
            .select()
            .from(schema_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.animales.id, id), (0, drizzle_orm_1.eq)(schema_1.animales.organizacionId, organizacionId)))
            .limit(1);
        if (!animal)
            throw new common_1.NotFoundException('Paciente no encontrado');
        return animal;
    }
    async actualizar(organizacionId, id, dto) {
        await this.obtener(organizacionId, id);
        if (dto.especieId) {
            const [especie] = await this.db
                .select({ id: schema_1.especies.id })
                .from(schema_1.especies)
                .where((0, drizzle_orm_1.eq)(schema_1.especies.id, dto.especieId))
                .limit(1);
            if (!especie)
                throw new common_1.BadRequestException('La especie indicada no existe');
        }
        if (dto.microchip && !(0, codigo_legible_util_1.validarMicrochipISO)(dto.microchip)) {
            throw new common_1.BadRequestException('El microchip no cumple el formato ISO (15 dígitos)');
        }
        if (dto.personaId) {
            const [dueno] = await this.db
                .select({ id: schema_1.personas.id })
                .from(schema_1.personas)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.personas.id, dto.personaId), (0, drizzle_orm_1.eq)(schema_1.personas.organizacionId, organizacionId)))
                .limit(1);
            if (!dueno) {
                throw new common_1.BadRequestException('El dueño indicado no existe en esta organización');
            }
        }
        const [animal] = await this.db
            .update(schema_1.animales)
            .set({
            ...(dto.nombre !== undefined && { nombre: dto.nombre }),
            ...(dto.especieId !== undefined && { especieId: dto.especieId }),
            ...(dto.personaId !== undefined && { personaId: dto.personaId }),
            ...(dto.sexo !== undefined && { sexo: dto.sexo }),
            ...(dto.fechaNacimiento !== undefined && { fechaNacimiento: dto.fechaNacimiento }),
            ...(dto.fechaNacEstimada !== undefined && { fechaNacEstimada: dto.fechaNacEstimada }),
            ...(dto.fotoUrl !== undefined && { fotoUrl: dto.fotoUrl }),
            ...(dto.microchip !== undefined && { microchip: dto.microchip }),
            ...(dto.estado !== undefined && { estado: dto.estado }),
            ...(dto.datosEspecificos !== undefined && { datosEspecificos: dto.datosEspecificos }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.animales.id, id), (0, drizzle_orm_1.eq)(schema_1.animales.organizacionId, organizacionId)))
            .returning();
        return animal;
    }
};
exports.AnimalesService = AnimalesService;
exports.AnimalesService = AnimalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AnimalesService);
//# sourceMappingURL=animales.service.js.map