import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { usuarios, organizaciones, membresias } from '../../database/schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
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

  /**
   * "Olvidé mi contraseña" — nunca revela si el email existe o no (siempre
   * resuelve igual), sólo dispara el mail cuando sí hay una cuenta. El token
   * es un JWT stateless de vida corta, mismo patrón que `PortalTokenService`
   * pero con `scope: 'reset_password'`; `resetearPassword()` lo invalida
   * comparando su `iat` contra `passwordChangedAt`.
   */
  async solicitarResetPassword(email: string): Promise<void> {
    const [user] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);
    if (!user) return;

    const token = this.jwt.sign(
      { sub: user.id, scope: 'reset_password' },
      { expiresIn: '30m' },
    );
    // Mismo origen que ya sirve el resto de la SPA (`PORTAL_BASE_URL`) — no
    // hace falta una variable nueva sólo para este link.
    const frontendUrl = process.env.PORTAL_BASE_URL ?? 'http://localhost:5173';
    const link = `${frontendUrl}/?resetToken=${token}`;
    await this.mail.enviar(
      user.email,
      'Recuperar tu contraseña',
      `<p>Recibimos un pedido para restablecer tu contraseña.</p>
       <p><a href="${link}">Hacé click acá para elegir una nueva</a> (válido por 30 minutos).</p>
       <p>Si no fuiste vos, podés ignorar este email.</p>`,
    );
  }

  async resetearPassword(token: string, nuevaPassword: string): Promise<void> {
    let payload: { sub?: string; scope?: string; iat?: number };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('El enlace es inválido o venció, pedí uno nuevo');
    }
    if (payload.scope !== 'reset_password' || !payload.sub) {
      throw new UnauthorizedException('El enlace es inválido o venció, pedí uno nuevo');
    }

    const [user] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, payload.sub))
      .limit(1);
    if (!user) throw new BadRequestException('El enlace es inválido o venció, pedí uno nuevo');

    if (user.passwordChangedAt && payload.iat! * 1000 < user.passwordChangedAt.getTime()) {
      throw new UnauthorizedException('Este enlace ya fue usado, pedí uno nuevo');
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await this.db
      .update(usuarios)
      .set({ passwordHash, passwordChangedAt: new Date() })
      .where(eq(usuarios.id, user.id));
  }

  /** Público a propósito — reutilizado por `interesados/` para loguear directo tras la activación (ver InteresadosService.activar()). */
  emitirTokens(sub: string, email: string) {
    return {
      accessToken: this.jwt.sign({ sub, email }),
      refreshToken: this.jwt.sign(
        { sub, tipo: 'refresh' },
        { expiresIn: this.config.get<string>('jwt.refreshExpiresIn') },
      ),
    };
  }
}
