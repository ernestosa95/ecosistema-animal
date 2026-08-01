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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_provider_1 = require("../../database/drizzle.provider");
const schema_1 = require("../../database/schema");
let AuthService = class AuthService {
    constructor(db, jwt) {
        this.db = db;
        this.jwt = jwt;
    }
    async register(dto) {
        const existe = await this.db
            .select({ id: schema_1.usuarios.id })
            .from(schema_1.usuarios)
            .where((0, drizzle_orm_1.eq)(schema_1.usuarios.email, dto.email))
            .limit(1);
        if (existe.length) {
            throw new common_1.ConflictException('El email ya está registrado');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const { user } = await this.db.transaction(async (tx) => {
            const [org] = await tx
                .insert(schema_1.organizaciones)
                .values({ nombre: dto.nombreOrganizacion, tipo: 'clinica' })
                .returning();
            const [usuario] = await tx
                .insert(schema_1.usuarios)
                .values({
                email: dto.email,
                passwordHash,
                nombre: dto.nombre,
                apellido: dto.apellido,
            })
                .returning();
            await tx.insert(schema_1.membresias).values({
                usuarioId: usuario.id,
                organizacionId: org.id,
                rol: 'propietario',
            });
            return { user: usuario, org };
        });
        return this.emitirToken(user.id, user.email);
    }
    async login(dto) {
        const [user] = await this.db
            .select()
            .from(schema_1.usuarios)
            .where((0, drizzle_orm_1.eq)(schema_1.usuarios.email, dto.email))
            .limit(1);
        if (!user)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        const ok = await bcrypt.compare(dto.password, user.passwordHash);
        if (!ok)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        const orgs = await this.db
            .select({ organizacionId: schema_1.membresias.organizacionId, rol: schema_1.membresias.rol })
            .from(schema_1.membresias)
            .where((0, drizzle_orm_1.eq)(schema_1.membresias.usuarioId, user.id));
        return {
            ...this.emitirToken(user.id, user.email),
            organizaciones: orgs,
        };
    }
    emitirToken(sub, email) {
        return { accessToken: this.jwt.sign({ sub, email }) };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map