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
exports.PersonasService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_provider_1 = require("../../database/drizzle.provider");
const schema_1 = require("../../database/schema");
let PersonasService = class PersonasService {
    constructor(db) {
        this.db = db;
    }
    async crear(organizacionId, dto) {
        if (dto.dni) {
            const [existe] = await this.db
                .select({ id: schema_1.personas.id })
                .from(schema_1.personas)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.personas.organizacionId, organizacionId), (0, drizzle_orm_1.eq)(schema_1.personas.dni, dto.dni)))
                .limit(1);
            if (existe) {
                throw new common_1.ConflictException('Ya existe una persona con ese DNI en la organización');
            }
        }
        const [persona] = await this.db
            .insert(schema_1.personas)
            .values({
            organizacionId,
            dni: dto.dni,
            nombre: dto.nombre,
            apellido: dto.apellido,
            sexo: dto.sexo,
            fechaNacimiento: dto.fechaNacimiento,
            celular: dto.celular,
            telefono: dto.telefono,
            email: dto.email,
        })
            .returning();
        return persona;
    }
    listar(organizacionId) {
        return this.db
            .select()
            .from(schema_1.personas)
            .where((0, drizzle_orm_1.eq)(schema_1.personas.organizacionId, organizacionId));
    }
    async obtener(organizacionId, id) {
        const [persona] = await this.db
            .select()
            .from(schema_1.personas)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.personas.id, id), (0, drizzle_orm_1.eq)(schema_1.personas.organizacionId, organizacionId)))
            .limit(1);
        if (!persona)
            throw new common_1.NotFoundException('Persona no encontrada');
        return persona;
    }
    async listarAnimales(organizacionId, personaId) {
        await this.obtener(organizacionId, personaId);
        return this.db
            .select()
            .from(schema_1.animales)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.animales.organizacionId, organizacionId), (0, drizzle_orm_1.eq)(schema_1.animales.personaId, personaId)));
    }
};
exports.PersonasService = PersonasService;
exports.PersonasService = PersonasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], PersonasService);
//# sourceMappingURL=personas.service.js.map