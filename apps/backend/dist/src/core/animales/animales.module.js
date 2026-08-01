"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalesModule = void 0;
const common_1 = require("@nestjs/common");
const animales_service_1 = require("./animales.service");
const animales_controller_1 = require("./animales.controller");
const auth_module_1 = require("../auth/auth.module");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
let AnimalesModule = class AnimalesModule {
};
exports.AnimalesModule = AnimalesModule;
exports.AnimalesModule = AnimalesModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [animales_controller_1.AnimalesController],
        providers: [animales_service_1.AnimalesService, tenant_guard_1.TenantGuard],
    })
], AnimalesModule);
//# sourceMappingURL=animales.module.js.map