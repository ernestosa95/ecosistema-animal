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
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_provider_1 = require("../../database/drizzle.provider");
const schema_1 = require("../../database/schema");
let TenantGuard = class TenantGuard {
    constructor(db) {
        this.db = db;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const organizacionId = req.headers['x-organizacion-id'];
        if (!organizacionId) {
            throw new common_1.ForbiddenException('Falta la organización (header X-Organizacion-Id)');
        }
        const [m] = await this.db
            .select({ rol: schema_1.membresias.rol })
            .from(schema_1.membresias)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.membresias.usuarioId, req.user.sub), (0, drizzle_orm_1.eq)(schema_1.membresias.organizacionId, organizacionId), (0, drizzle_orm_1.eq)(schema_1.membresias.activo, true)))
            .limit(1);
        if (!m) {
            throw new common_1.ForbiddenException('No pertenecés a esta organización');
        }
        req.organizacionId = organizacionId;
        req.rol = m.rol;
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map