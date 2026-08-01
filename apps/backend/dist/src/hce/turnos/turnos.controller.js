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
exports.TurnosController = void 0;
const common_1 = require("@nestjs/common");
const turnos_service_1 = require("./turnos.service");
const create_turno_dto_1 = require("./dto/create-turno.dto");
const update_estado_turno_dto_1 = require("./dto/update-estado-turno.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const current_context_decorator_1 = require("../../common/decorators/current-context.decorator");
let TurnosController = class TurnosController {
    constructor(turnos) {
        this.turnos = turnos;
    }
    solicitar(organizacionId, dto) {
        return this.turnos.solicitar(organizacionId, dto);
    }
    agenda(organizacionId, desde, hasta) {
        return this.turnos.agenda(organizacionId, desde, hasta);
    }
    porAnimal(organizacionId, animalId) {
        return this.turnos.porAnimal(organizacionId, animalId);
    }
    obtener(organizacionId, id) {
        return this.turnos.obtener(organizacionId, id);
    }
    cambiarEstado(organizacionId, id, dto) {
        return this.turnos.cambiarEstado(organizacionId, id, dto);
    }
};
exports.TurnosController = TurnosController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_turno_dto_1.CreateTurnoDto]),
    __metadata("design:returntype", void 0)
], TurnosController.prototype, "solicitar", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Query)('desde')),
    __param(2, (0, common_1.Query)('hasta')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], TurnosController.prototype, "agenda", null);
__decorate([
    (0, common_1.Get)('animal/:animalId'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('animalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TurnosController.prototype, "porAnimal", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TurnosController.prototype, "obtener", null);
__decorate([
    (0, common_1.Patch)(':id/estado'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_estado_turno_dto_1.UpdateEstadoTurnoDto]),
    __metadata("design:returntype", void 0)
], TurnosController.prototype, "cambiarEstado", null);
exports.TurnosController = TurnosController = __decorate([
    (0, common_1.Controller)('turnos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [turnos_service_1.TurnosService])
], TurnosController);
//# sourceMappingURL=turnos.controller.js.map