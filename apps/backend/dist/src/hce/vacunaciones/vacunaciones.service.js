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
exports.VacunacionesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_provider_1 = require("../../database/drizzle.provider");
const schema_1 = require("../../database/schema");
let VacunacionesService = class VacunacionesService {
    constructor(db) {
        this.db = db;
    }
    async verificarAnimal(organizacionId, animalId) {
        const [a] = await this.db
            .select({ id: schema_1.animales.id })
            .from(schema_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.animales.id, animalId), (0, drizzle_orm_1.eq)(schema_1.animales.organizacionId, organizacionId)))
            .limit(1);
        if (!a)
            throw new common_1.NotFoundException('El paciente no existe en esta organización');
    }
    async registrar(organizacionId, veterinarioId, dto) {
        await this.verificarAnimal(organizacionId, dto.animalId);
        const [vacunacion] = await this.db
            .insert(schema_1.vacunaciones)
            .values({
            organizacionId,
            animalId: dto.animalId,
            veterinarioId,
            producto: dto.producto,
            vademecumId: dto.vademecumId,
            fecha: dto.fecha,
            proximaDosis: dto.proximaDosis,
            loteProducto: dto.loteProducto,
        })
            .returning();
        return vacunacion;
    }
    async historiaPorAnimal(organizacionId, animalId) {
        await this.verificarAnimal(organizacionId, animalId);
        return this.db
            .select()
            .from(schema_1.vacunaciones)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vacunaciones.organizacionId, organizacionId), (0, drizzle_orm_1.eq)(schema_1.vacunaciones.animalId, animalId), (0, drizzle_orm_1.isNull)(schema_1.vacunaciones.deletedAt)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.vacunaciones.fecha));
    }
    async recordatorios(organizacionId, dias = 30) {
        return this.db
            .select({
            id: schema_1.vacunaciones.id,
            animalId: schema_1.vacunaciones.animalId,
            animalNombre: schema_1.animales.nombre,
            codigoLegible: schema_1.animales.codigoLegible,
            producto: schema_1.vacunaciones.producto,
            proximaDosis: schema_1.vacunaciones.proximaDosis,
            loteProducto: schema_1.vacunaciones.loteProducto,
        })
            .from(schema_1.vacunaciones)
            .innerJoin(schema_1.animales, (0, drizzle_orm_1.eq)(schema_1.animales.id, schema_1.vacunaciones.animalId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vacunaciones.organizacionId, organizacionId), (0, drizzle_orm_1.isNull)(schema_1.vacunaciones.deletedAt), (0, drizzle_orm_1.isNotNull)(schema_1.vacunaciones.proximaDosis), (0, drizzle_orm_1.sql) `${schema_1.vacunaciones.proximaDosis} <= current_date + ${dias}::int`))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.vacunaciones.proximaDosis));
    }
};
exports.VacunacionesService = VacunacionesService;
exports.VacunacionesService = VacunacionesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], VacunacionesService);
//# sourceMappingURL=vacunaciones.service.js.map