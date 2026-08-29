import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { mensajes, mensajesLeidos, organizaciones } from '../database/schema';

@Injectable()
export class MensajesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Anuncios de la plataforma vigentes para esta organización, sin leer por este usuario. */
  async pendientes(organizacionId: string, usuarioId: string) {
    const [org] = await this.db
      .select({ grupoId: organizaciones.grupoId })
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);

    const condicionesDestino = [eq(mensajes.destinatarioTipo, 'todas'), eq(mensajes.organizacionId, organizacionId)];
    if (org?.grupoId) condicionesDestino.push(eq(mensajes.grupoId, org.grupoId));

    const candidatos = await this.db
      .select()
      .from(mensajes)
      .where(and(isNull(mensajes.deletedAt), or(...condicionesDestino)))
      .orderBy(desc(mensajes.publicadoEn));

    if (candidatos.length === 0) return [];

    const leidos = await this.db
      .select({ mensajeId: mensajesLeidos.mensajeId })
      .from(mensajesLeidos)
      .where(
        and(
          eq(mensajesLeidos.usuarioId, usuarioId),
          inArray(
            mensajesLeidos.mensajeId,
            candidatos.map((m) => m.id),
          ),
        ),
      );
    const idsLeidos = new Set(leidos.map((l) => l.mensajeId));

    return candidatos.filter((m) => !idsLeidos.has(m.id));
  }

  /** Marca un mensaje como leído/descartado por este usuario (idempotente). */
  async marcarLeido(mensajeId: string, usuarioId: string) {
    const [existente] = await this.db
      .select({ id: mensajesLeidos.id })
      .from(mensajesLeidos)
      .where(and(eq(mensajesLeidos.mensajeId, mensajeId), eq(mensajesLeidos.usuarioId, usuarioId)))
      .limit(1);
    if (!existente) {
      await this.db.insert(mensajesLeidos).values({ mensajeId, usuarioId });
    }
    return { ok: true };
  }
}
