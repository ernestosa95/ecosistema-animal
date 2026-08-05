import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Permite el acceso solo si el email del usuario autenticado está en la lista
 * SUPERADMIN_EMAILS del entorno (separados por coma). Debe correr después de
 * JwtAuthGuard (que setea req.user con { sub, email }).
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const email: string | undefined = req.user?.email?.toLowerCase();
    const lista = (process.env.SUPERADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!email || !lista.includes(email)) {
      throw new ForbiddenException('Se requiere super-administrador de plataforma');
    }
    return true;
  }
}
