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
exports.ConsultasController = void 0;
const common_1 = require("@nestjs/common");
const consultas_service_1 = require("./consultas.service");
const create_consulta_dto_1 = require("./dto/create-consulta.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const current_context_decorator_1 = require("../../common/decorators/current-context.decorator");
let ConsultasController = class ConsultasController {
    constructor(consultas) {
        this.consultas = consultas;
    }
    crear(organizacionId, user, dto) {
        return this.consultas.crear(organizacionId, user.sub, dto);
    }
    historia(organizacionId, animalId) {
        return this.consultas.historiaPorAnimal(organizacionId, animalId);
    }
    obtener(organizacionId, id) {
        return this.consultas.obtener(organizacionId, id);
    }
};
exports.ConsultasController = ConsultasController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, current_context_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_consulta_dto_1.CreateConsultaDto]),
    __metadata("design:returntype", void 0)
], ConsultasController.prototype, "crear", null);
__decorate([
    (0, common_1.Get)('animal/:animalId'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('animalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConsultasController.prototype, "historia", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_context_decorator_1.CurrentOrg)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConsultasController.prototype, "obtener", null);
exports.ConsultasController = ConsultasController = __decorate([
    (0, common_1.Controller)('consultas'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [consultas_service_1.ConsultasService])
], ConsultasController);
//# sourceMappingURL=consultas.controller.js.map