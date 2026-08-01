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
exports.ConsultasService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_provider_1 = require("../../database/drizzle.provider");
const schema_1 = require("../../database/schema");
let ConsultasService = class ConsultasService {
    constructor(db) {
        this.db = db;
    }
    async verificarAnimal(organizacionId, animalId) {
        const [animal] = await this.db
            .select({ id: schema_1.animales.id })
            .from(schema_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.animales.id, animalId), (0, drizzle_orm_1.eq)(schema_1.animales.organizacionId, organizacionId)))
            .limit(1);
        if (!animal) {
            throw new common_1.NotFoundException('El paciente no existe en esta organización');
        }
    }
    async crear(organizacionId, veterinarioId, dto) {
        await this.verificarAnimal(organizacionId, dto.animalId);
        const [consulta] = await this.db
            .insert(schema_1.consultas)
            .values({
            organizacionId,
            animalId: dto.animalId,
            veterinarioId,
            fecha: dto.fecha ? new Date(dto.fecha) : undefined,
            motivo: dto.motivo,
            anamnesis: dto.anamnesis,
            examenFisico: dto.examenFisico,
            diagnostico: dto.diagnostico,
            tratamiento: dto.tratamiento,
            pesoKg: dto.pesoKg?.toString(),
            temperaturaC: dto.temperaturaC?.toString(),
            observaciones: dto.observaciones,
        })
            .returning();
        return consulta;
    }
    async historiaPorAnimal(organizacionId, animalId) {
        await this.verificarAnimal(organizacionId, animalId);
        return this.db
            .select()
            .from(schema_1.consultas)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.consultas.organizacionId, organizacionId), (0, drizzle_orm_1.eq)(schema_1.consultas.animalId, animalId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.consultas.fecha));
    }
    async obtener(organizacionId, id) {
        const [consulta] = await this.db
            .select()
            .from(schema_1.consultas)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.consultas.id, id), (0, drizzle_orm_1.eq)(schema_1.consultas.organizacionId, organizacionId)))
            .limit(1);
        if (!consulta)
            throw new common_1.NotFoundException('Consulta no encontrada');
        return consulta;
    }
};
exports.ConsultasService = ConsultasService;
exports.ConsultasService = ConsultasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], ConsultasService);
//# sourceMappingURL=consultas.service.js.map