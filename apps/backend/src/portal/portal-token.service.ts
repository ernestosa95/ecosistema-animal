import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface PortalTokenPayload {
  scope: 'portal';
  personaId: string;
  organizacionId: string;
}

/**
 * Emite y valida los tokens de acceso del portal del dueño.
 * Reutiliza el JwtService de la app (mismo secreto), pero con un `scope: 'portal'`
 * que lo distingue de los tokens de staff, y una vigencia más larga (magic-link).
 */
@Injectable()
export class PortalTokenService {
  constructor(private readonly jwt: JwtService) {}

  emitir(persona: { id: string; organizacionId: string }): string {
    return this.jwt.sign(
      { scope: 'portal', personaId: persona.id, organizacionId: persona.organizacionId },
      { expiresIn: '30d' },
    );
  }

  verificar(token: string): PortalTokenPayload {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Enlace inválido o vencido');
    }
    if (payload?.scope !== 'portal') {
      throw new UnauthorizedException('Token no autorizado para el portal');
    }
    return payload as PortalTokenPayload;
  }
}
