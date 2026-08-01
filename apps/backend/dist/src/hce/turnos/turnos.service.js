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
exports.TurnosService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_provider_1 = require("../../database/drizzle.provider");
const schema_1 = require("../../database/schema");
const ESTADOS_TERMINALES = new Set(['cancelado', 'atendido', 'ausente']);
let TurnosService = class TurnosService {
    constructor(db) {
        this.db = db;
    }
    async solicitar(organizacionId, dto) {
        const [animal] = await this.db
            .select({ id: schema_1.animales.id, personaId: schema_1.animales.personaId })
            .from(schema_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.animales.id, dto.animalId), (0, drizzle_orm_1.eq)(schema_1.animales.organizacionId, organizacionId)))
            .limit(1);
        if (!animal) {
            throw new common_1.NotFoundException('El paciente no existe en esta organización');
        }
        const [turno] = await this.db
            .insert(schema_1.turnos)
            .values({
            organizacionId,
            animalId: dto.animalId,
            personaId: animal.personaId,
            fechaHora: new Date(dto.fechaHora),
            estado: 'solicitado',
            motivo: dto.motivo,
            canal: dto.canal ?? 'portal',
        })
            .returning();
        return turno;
    }
    async cambiarEstado(organizacionId, id, dto) {
        const turno = await this.obtener(organizacionId, id);
        if (ESTADOS_TERMINALES.has(turno.estado)) {
            throw new common_1.BadRequestException(`El turno está en estado "${turno.estado}" y no admite cambios`);
        }
        if (dto.estado === 'reprogramado' && !dto.fechaHora) {
            throw new common_1.BadRequestException('Para reprogramar hay que indicar la nueva fecha/hora');
        }
        const [actualizado] = await this.db
            .update(schema_1.turnos)
            .set({
            estado: dto.estado,
            fechaHora: dto.fechaHora ? new Date(dto.fechaHora) : turno.fechaHora,
            veterinarioId: dto.veterinarioId ?? turno.veterinarioId,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.turnos.id, id), (0, drizzle_orm_1.eq)(schema_1.turnos.organizacionId, organizacionId)))
            .returning();
        return actualizado;
    }
    agenda(organizacionId, desde, hasta) {
        const filtros = [(0, drizzle_orm_1.eq)(schema_1.turnos.organizacionId, organizacionId)];
        if (desde)
            filtros.push((0, drizzle_orm_1.gte)(schema_1.turnos.fechaHora, new Date(desde)));
        if (hasta)
            filtros.push((0, drizzle_orm_1.lte)(schema_1.turnos.fechaHora, new Date(hasta)));
        return this.db
            .select()
            .from(schema_1.turnos)
            .where((0, drizzle_orm_1.and)(...filtros))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.turnos.fechaHora));
    }
    porAnimal(organizacionId, animalId) {
        return this.db
            .select()
            .from(schema_1.turnos)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.turnos.organizacionId, organizacionId), (0, drizzle_orm_1.eq)(schema_1.turnos.animalId, animalId)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.turnos.fechaHora));
    }
    async obtener(organizacionId, id) {
        const [turno] = await this.db
            .select()
            .from(schema_1.turnos)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.turnos.id, id), (0, drizzle_orm_1.eq)(schema_1.turnos.organizacionId, organizacionId)))
            .limit(1);
        if (!turno)
            throw new common_1.NotFoundException('Turno no encontrado');
        return turno;
    }
};
exports.TurnosService = TurnosService;
exports.TurnosService = TurnosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], TurnosService);
//# sourceMappingURL=turnos.service.js.map