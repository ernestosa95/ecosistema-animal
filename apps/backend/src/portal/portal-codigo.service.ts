import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { personas, portalCodigos } from '../database/schema';

const VIGENCIA_MINUTOS = 15;
const MAX_INTENTOS_FALLIDOS = 5;
// Sin 0/O/1/I/L — se lee/dicta en voz alta o se anota a mano en el mostrador,
// esos caracteres se confunden entre sí.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO_CODIGO = 8;

function generarCodigo(): string {
  let out = '';
  for (let i = 0; i < LARGO_CODIGO; i++) {
    out += ALFABETO[randomInt(ALFABETO.length)];
  }
  return out;
}

/** Deja sólo dígitos — el DNI es texto libre en `personas`, puede tener puntos/espacios. */
function normalizarDni(v: string): string {
  return v.replace(/\D/g, '');
}

export interface PersonaIdentidad {
  id: string;
  organizacionId: string;
}

/**
 * Tercera vía de acceso al portal del dueño: el staff emite un código corto
 * que el dueño canjea junto a su DNI desde una página pública (`/portal` en
 * la web) para obtener el mismo token de `PortalTokenService` que ya emite
 * el magic-link — esto NO es un mecanismo de sesión propio, sólo otra forma
 * de conseguir ese token cuando el dueño no tiene a mano el link/QR
 * anterior. El código es reutilizable, no de un solo uso: cierra sólo por
 * inactividad (15 min sin canjearse), ver `canjear()`.
 */
@Injectable()
export class PortalCodigoService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** STAFF — genera (y muestra una sola vez) un código nuevo para una persona de la org. */
  async generar(personaId: string, organizacionId: string): Promise<{ codigo: string; expiraEnMinutos: number }> {
    const [persona] = await this.db
      .select({ id: personas.id, dni: personas.dni })
      .from(personas)
      .where(and(eq(personas.id, personaId), eq(personas.organizacionId, organizacionId), isNull(personas.deletedAt)))
      .limit(1);

    if (!persona) {
      throw new NotFoundException('Dueño no encontrado en esta organización');
    }
    if (!persona.dni) {
      throw new BadRequestException('Este dueño no tiene DNI cargado — completalo antes de generar un código');
    }

    // Un código activo por persona: cualquiera anterior queda inválido.
    await this.db.delete(portalCodigos).where(eq(portalCodigos.personaId, personaId));

    const codigo = generarCodigo();
    const codigoHash = await bcrypt.hash(codigo, 10);
    const expiresAt = new Date(Date.now() + VIGENCIA_MINUTOS * 60_000);

    await this.db.insert(portalCodigos).values({ personaId, organizacionId, codigoHash, expiresAt });

    return { codigo, expiraEnMinutos: VIGENCIA_MINUTOS };
  }

  /**
   * DUEÑO — canjea DNI + código por la identidad de la persona (el controller
   * usa esa identidad para emitir el token real vía PortalTokenService).
   * Busca por el código (recorre los candidatos vigentes y compara con
   * bcrypt, no hay forma de indexar un hash salteado) y recién ahí valida el
   * DNI — así un intento fallido siempre quede atado a un código real y no a
   * un DNI adivinado. Sin límite de organizaciones en la búsqueda a
   * propósito: es un endpoint público, todavía no hay contexto de tenant.
   *
   * Reutilizable a propósito: un canje exitoso NO invalida el código, corre
   * `expiresAt` 15 minutos hacia adelante (ventana de inactividad, no un
   * solo uso) y limpia el contador de intentos fallidos. El dueño puede
   * volver a entrar con el mismo código mientras siga activo; si pasan 15
   * minutos sin canjearlo, deja de servir y el staff tiene que emitir uno
   * nuevo.
   */
  async canjear(dniInput: string, codigoInput: string): Promise<PersonaIdentidad> {
    const dni = normalizarDni(dniInput);
    const codigo = codigoInput.trim().toUpperCase();

    const candidatos = await this.db
      .select({
        id: portalCodigos.id,
        personaId: portalCodigos.personaId,
        organizacionId: portalCodigos.organizacionId,
        codigoHash: portalCodigos.codigoHash,
        intentosFallidos: portalCodigos.intentosFallidos,
        personaDni: personas.dni,
      })
      .from(portalCodigos)
      .innerJoin(personas, eq(portalCodigos.personaId, personas.id))
      .where(gt(portalCodigos.expiresAt, new Date()));

    for (const c of candidatos) {
      if (!(await bcrypt.compare(codigo, c.codigoHash))) continue;

      const dniOk = dni.length > 0 && normalizarDni(c.personaDni ?? '') === dni;
      if (!dniOk) {
        const fallidos = c.intentosFallidos + 1;
        if (fallidos >= MAX_INTENTOS_FALLIDOS) {
          await this.db.delete(portalCodigos).where(eq(portalCodigos.id, c.id));
        } else {
          await this.db.update(portalCodigos).set({ intentosFallidos: fallidos }).where(eq(portalCodigos.id, c.id));
        }
        throw new UnauthorizedException('Código o DNI incorrectos');
      }

      const expiresAt = new Date(Date.now() + VIGENCIA_MINUTOS * 60_000);
      await this.db.update(portalCodigos).set({ expiresAt, intentosFallidos: 0 }).where(eq(portalCodigos.id, c.id));
      return { id: c.personaId, organizacionId: c.organizacionId };
    }

    throw new UnauthorizedException('Código o DNI incorrectos, o venció por inactividad');
  }
}
