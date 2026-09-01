import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { usuarios, organizaciones, membresias } from '../../database/schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Registra un usuario nuevo, le crea su organización y lo deja como
   * propietario de la misma. Todo en una transacción.
   */
  async register(dto: RegisterDto) {
    const existe = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, dto.email))
      .limit(1);
    if (existe.length) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { user } = await this.db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizaciones)
        .values({ nombre: dto.nombreOrganizacion })
        .returning();
      const [usuario] = await tx
        .insert(usuarios)
        .values({
          email: dto.email,
          passwordHash,
          nombre: dto.nombre,
          apellido: dto.apellido,
        })
        .returning();
      await tx.insert(membresias).values({
        usuarioId: usuario.id,
        organizacionId: org.id,
        roles: ['propietario'],
      });
      return { user: usuario, org };
    });

    return this.emitirTokens(user.id, user.email);
  }

  /**
   * Verifica credenciales y devuelve un access token + las organizaciones
   * a las que el usuario pertenece (para que el cliente elija el tenant activo).
   */
  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, dto.email))
      .limit(1);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const orgs = await this.db
      .select({
        organizacionId: membresias.organizacionId,
        roles: membresias.roles,
        huellaActiva: organizaciones.huellaActiva,
        troperaActiva: organizaciones.troperaActiva,
      })
      .from(membresias)
      .innerJoin(organizaciones, eq(organizaciones.id, membresias.organizacionId))
      .where(eq(membresias.usuarioId, user.id));

    return {
      ...this.emitirTokens(user.id, user.email),
      organizaciones: orgs,
    };
  }

  /**
   * Cambia un refresh token vigente por un par de tokens nuevo (rotación).
   * Stateless: no hay tabla de refresh tokens, se valida sólo por firma +
   * expiración + el claim `tipo: 'refresh'` (así no sirve como access token).
   */
  async refrescar(refreshToken: string) {
    let payload: { sub?: string; tipo?: string };
    try {
      payload = this.jwt.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.tipo !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const [user] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, payload.sub))
      .limit(1);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    return this.emitirTokens(user.id, user.email);
  }

  private emitirTokens(sub: string, email: string) {
    return {
      accessToken: this.jwt.sign({ sub, email }),
      refreshToken: this.jwt.sign(
        { sub, tipo: 'refresh' },
        { expiresIn: this.config.get<string>('jwt.refreshExpiresIn') },
      ),
    };
  }
}
