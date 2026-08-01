import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { membresias } from '../../database/schema';

/**
 * Resuelve la organización activa (header X-Organizacion-Id) y verifica que el
 * usuario tenga una membresía activa en ella. Adjunta req.organizacionId y
 * req.rol para el resto de la cadena. Debe ejecutarse DESPUÉS de JwtAuthGuard.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const organizacionId: string | undefined = req.headers['x-organizacion-id'];
    if (!organizacionId) {
      throw new ForbiddenException('Falta la organización (header X-Organizacion-Id)');
    }

    const [m] = await this.db
      .select({ rol: membresias.rol })
      .from(membresias)
      .where(
        and(
          eq(membresias.usuarioId, req.user.sub),
          eq(membresias.organizacionId, organizacionId),
          eq(membresias.activo, true),
        ),
      )
      .limit(1);

    if (!m) {
      throw new ForbiddenException('No pertenecés a esta organización');
    }

    req.organizacionId = organizacionId;
    req.rol = m.rol;
    return true;
  }
}
