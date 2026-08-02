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
exports.PersonasController = void 0;
const common_1 = require("@nestjs/common");
const personas_service_1 = require("./personas.service");
const create_persona_dto_1 = require("./dto/create-persona.dto");
const update_persona_dto_1 = require("./dto/update-persona.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const current_context_decorator_1 = require("../../common/decorators/current-context.decorator");
let PersonasController = class PersonasController {
    constructor(personas) {
        this.personas = personas;
    }
    crear(organizacionId, dto) {
        return this.personas.crear(organizacionId, dto);
    }
    listar(organizacionId) {
        return this.personas.listar(organizacionId);
    }
    obtener(organizacionId, id) {
        return this.personas.obtener(organizacionId, id);
    }
    actualizar(organizacionId, id, dto) {
        return this.personas.actualizar(organizacionId, id, dto);
    }
    animales(organizacionId, id) {
        return this.personas.listarAnimales(organizacionId, id);
    }
};
exports.PersonasController = PersonasController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_persona_dto_1.CreatePersonaDto]),
    __metadata("design:returntype", void 0)
], PersonasController.prototype, "crear", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PersonasController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PersonasController.prototype, "obtener", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_persona_dto_1.UpdatePersonaDto]),
    __metadata("design:returntype", void 0)
], PersonasController.prototype, "actualizar", null);
__decorate([
    (0, common_1.Get)(':id/animales'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PersonasController.prototype, "animales", null);
exports.PersonasController = PersonasController = __decorate([
    (0, common_1.Controller)('personas'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [personas_service_1.PersonasService])
], PersonasController);
//# sourceMappingURL=personas.controller.js.map