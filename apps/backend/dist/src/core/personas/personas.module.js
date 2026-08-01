"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonasModule = void 0;
const common_1 = require("@nestjs/common");
const personas_service_1 = require("./personas.service");
const personas_controller_1 = require("./personas.controller");
const auth_module_1 = require("../auth/auth.module");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
let PersonasModule = class PersonasModule {
};
exports.PersonasModule = PersonasModule;
exports.PersonasModule = PersonasModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [personas_controller_1.PersonasController],
        providers: [personas_service_1.PersonasService, tenant_guard_1.TenantGuard],
        exports: [personas_service_1.PersonasService],
    })
], PersonasModule);
//# sourceMappingURL=personas.module.js.map