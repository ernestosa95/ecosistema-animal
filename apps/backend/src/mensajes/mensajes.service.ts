import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { mensajes, mensajesLeidos, mensajeRespuestas, organizaciones } from '../database/schema';
import { ResponderMensajeDto } from './dto/responder-mensaje.dto';

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

  /**
   * Guarda las respuestas del feedback opcional de un mensaje y lo marca
   * leído en el mismo paso — responder ya implica descartar el banner, ver
   * MensajesBanner.tsx. Reenvío = pisa SÓLO las preguntas incluidas en este
   * envío (borra esas filas puntuales del mismo usuario+mensaje e inserta de
   * nuevo) — no todas las respuestas previas del usuario a este mensaje,
   * porque un mensaje puede tener varias preguntas y un reenvío parcial (ej.
   * corregir una sola respuesta) no debe borrar las demás ya contestadas.
   */
  async responder(mensajeId: string, usuarioId: string, organizacionId: string, dto: ResponderMensajeDto) {
    const [mensaje] = await this.db
      .select({ preguntas: mensajes.preguntas })
      .from(mensajes)
      .where(and(eq(mensajes.id, mensajeId), isNull(mensajes.deletedAt)))
      .limit(1);
    if (!mensaje) throw new NotFoundException('Mensaje no encontrado');

    const idsValidos = new Set((mensaje.preguntas as Array<{ id: string }>).map((p) => p.id));
    for (const r of dto.respuestas) {
      if (!idsValidos.has(r.preguntaId)) {
        throw new BadRequestException(`La pregunta ${r.preguntaId} no pertenece a este mensaje`);
      }
    }

    await this.db
      .delete(mensajeRespuestas)
      .where(
        and(
          eq(mensajeRespuestas.mensajeId, mensajeId),
          eq(mensajeRespuestas.usuarioId, usuarioId),
          inArray(
            mensajeRespuestas.preguntaId,
            dto.respuestas.map((r) => r.preguntaId),
          ),
        ),
      );
    await this.db.insert(mensajeRespuestas).values(
      dto.respuestas.map((r) => ({
        mensajeId,
        preguntaId: r.preguntaId,
        usuarioId,
        organizacionId,
        respuesta: r.respuesta,
      })),
    );

    await this.marcarLeido(mensajeId, usuarioId);
    return { ok: true };
  }
}
