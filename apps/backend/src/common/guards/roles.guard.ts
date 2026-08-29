import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Compara los roles del usuario en la organización activa (req.roles,
 * arreglo seteado por TenantGuard — roles apilables) contra los roles
 * requeridos por @Roles(). Alcanza con que coincida UNO solo. Debe
 * ejecutarse DESPUÉS de TenantGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos?.length) return true;

    const req = context.switchToHttp().getRequest();
    const roles: string[] = req.roles ?? [];
    if (!requeridos.some((r) => roles.includes(r))) {
      throw new ForbiddenException('No tenés permiso para esta acción');
    }
    return true;
  }
}
