"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HceModule = void 0;
const common_1 = require("@nestjs/common");
const consultas_service_1 = require("./consultas/consultas.service");
const consultas_controller_1 = require("./consultas/consultas.controller");
const vacunaciones_service_1 = require("./vacunaciones/vacunaciones.service");
const vacunaciones_controller_1 = require("./vacunaciones/vacunaciones.controller");
const turnos_service_1 = require("./turnos/turnos.service");
const turnos_controller_1 = require("./turnos/turnos.controller");
const auth_module_1 = require("../core/auth/auth.module");
const tenant_guard_1 = require("../common/guards/tenant.guard");
let HceModule = class HceModule {
};
exports.HceModule = HceModule;
exports.HceModule = HceModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [consultas_controller_1.ConsultasController, vacunaciones_controller_1.VacunacionesController, turnos_controller_1.TurnosController],
        providers: [consultas_service_1.ConsultasService, vacunaciones_service_1.VacunacionesService, turnos_service_1.TurnosService, tenant_guard_1.TenantGuard],
    })
], HceModule);
//# sourceMappingURL=hce.module.js.map