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
exports.VacunacionesController = void 0;
const common_1 = require("@nestjs/common");
const vacunaciones_service_1 = require("./vacunaciones.service");
const create_vacunacion_dto_1 = require("./dto/create-vacunacion.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const current_context_decorator_1 = require("../../common/decorators/current-context.decorator");
let VacunacionesController = class VacunacionesController {
    constructor(vacunaciones) {
        this.vacunaciones = vacunaciones;
    }
    registrar(organizacionId, user, dto) {
        return this.vacunaciones.registrar(organizacionId, user.sub, dto);
    }
    recordatorios(organizacionId, dias) {
        const d = dias ? parseInt(dias, 10) : 30;
        return this.vacunaciones.recordatorios(organizacionId, Number.isNaN(d) ? 30 : d);
    }
    historia(organizacionId, animalId) {
        return this.vacunaciones.historiaPorAnimal(organizacionId, animalId);
    }
};
exports.VacunacionesController = VacunacionesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, current_context_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_vacunacion_dto_1.CreateVacunacionDto]),
    __metadata("design:returntype", void 0)
], VacunacionesController.prototype, "registrar", null);
__decorate([
    (0, common_1.Get)('recordatorios'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Query)('dias')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VacunacionesController.prototype, "recordatorios", null);
__decorate([
    (0, common_1.Get)('animal/:animalId'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('animalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VacunacionesController.prototype, "historia", null);
exports.VacunacionesController = VacunacionesController = __decorate([
    (0, common_1.Controller)('vacunaciones'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [vacunaciones_service_1.VacunacionesService])
], VacunacionesController);
//# sourceMappingURL=vacunaciones.controller.js.map