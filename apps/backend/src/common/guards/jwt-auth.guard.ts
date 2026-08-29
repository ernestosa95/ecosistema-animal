import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Verifica el Bearer token y adjunta el payload del usuario a la request
 * (req.user = { sub, email }).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }
    try {
      const payload = this.jwt.verify(header.slice(7));
      if (payload?.tipo === 'refresh') {
        // Un refresh token no habilita acceso: sólo sirve para /auth/refresh.
        throw new Error('refresh token used as access token');
      }
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
