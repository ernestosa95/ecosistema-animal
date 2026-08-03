import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { personas } from '../database/schema';
import { PortalTokenService } from './portal-token.service';

/**
 * Autentica al dueño por el header `X-Portal-Token`. Verifica el token,
 * carga la persona y la adjunta a la request (req.persona). No usa el JWT
 * del staff: es el acceso propio del portal.
 */
@Injectable()
export class PortalGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly tokens: PortalTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token: string | undefined = req.headers['x-portal-token'];
    if (!token) {
      throw new UnauthorizedException('Falta el token de acceso del portal');
    }

    const payload = this.tokens.verificar(token);

    const [persona] = await this.db
      .select({
        id: personas.id,
        organizacionId: personas.organizacionId,
        nombre: personas.nombre,
        apellido: personas.apellido,
      })
      .from(personas)
      .where(and(eq(personas.id, payload.personaId), isNull(personas.deletedAt)))
      .limit(1);

    if (!persona) {
      throw new UnauthorizedException('El acceso ya no es válido');
    }

    req.persona = persona;
    return true;
  }
}
