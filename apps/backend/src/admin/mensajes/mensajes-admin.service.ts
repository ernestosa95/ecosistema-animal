import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { mensajes, mensajeRespuestas, organizaciones } from '../../database/schema';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';

/** Forma de una pregunta ya guardada (con `id` asignado) dentro de `mensajes.preguntas`. */
interface Pregunta {
  id: string;
  tipo: 'si_no' | 'opcion_multiple' | 'texto_breve';
  texto: string;
  opciones?: string[];
}

@Injectable()
export class MensajesAdminService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Anuncios de la plataforma ya creados (vista del admin, más recientes primero). */
  listar() {
    return this.db
      .select()
      .from(mensajes)
      .where(isNull(mensajes.deletedAt))
      .orderBy(desc(mensajes.publicadoEn));
  }

  async crear(usuarioId: string, dto: CrearMensajeDto) {
    if (dto.destinatarioTipo === 'organizacion' && !dto.organizacionId) {
      throw new BadRequestException('Falta la organización de destino');
    }
    if (dto.destinatarioTipo === 'grupo' && !dto.grupoId) {
      throw new BadRequestException('Falta el grupo de destino');
    }

    // El `id` de cada pregunta lo asigna el server (no el admin al componer
    // el form) — es lo que después referencia mensaje_respuestas.pregunta_id.
    const preguntas: Pregunta[] = (dto.preguntas ?? []).map((p) => ({
      id: randomUUID(),
      tipo: p.tipo,
      texto: p.texto,
      ...(p.tipo === 'opcion_multiple' ? { opciones: p.opciones } : {}),
    }));

    const [mensaje] = await this.db
      .insert(mensajes)
      .values({
        titulo: dto.titulo,
        cuerpo: dto.cuerpo,
        destinatarioTipo: dto.destinatarioTipo,
        organizacionId: dto.destinatarioTipo === 'organizacion' ? dto.organizacionId : null,
        grupoId: dto.destinatarioTipo === 'grupo' ? dto.grupoId : null,
        creadoPor: usuarioId,
        preguntas,
      })
      .returning();
    return mensaje;
  }

  async eliminar(id: string) {
    const [m] = await this.db
      .select({ id: mensajes.id })
      .from(mensajes)
      .where(and(eq(mensajes.id, id), isNull(mensajes.deletedAt)))
      .limit(1);
    if (!m) throw new NotFoundException('Mensaje no encontrado');
    await this.db.update(mensajes).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(mensajes.id, id));
    return { ok: true };
  }

  /**
   * Respuestas de feedback de un mensaje, agregadas por pregunta — conteos
   * por opción para sí/no y opción múltiple, lista de texto libre para
   * texto_breve. `totalRespondieron` cuenta usuarios distintos, no filas
   * (uno puede responder varias preguntas del mismo mensaje).
   */
  async respuestas(mensajeId: string) {
    const [mensaje] = await this.db
      .select({ id: mensajes.id, titulo: mensajes.titulo, preguntas: mensajes.preguntas })
      .from(mensajes)
      .where(and(eq(mensajes.id, mensajeId), isNull(mensajes.deletedAt)))
      .limit(1);
    if (!mensaje) throw new NotFoundException('Mensaje no encontrado');

    const filas = await this.db
      .select({
        preguntaId: mensajeRespuestas.preguntaId,
        respuesta: mensajeRespuestas.respuesta,
        usuarioId: mensajeRespuestas.usuarioId,
        organizacionNombre: organizaciones.nombre,
        createdAt: mensajeRespuestas.createdAt,
      })
      .from(mensajeRespuestas)
      .innerJoin(organizaciones, eq(mensajeRespuestas.organizacionId, organizaciones.id))
      .where(eq(mensajeRespuestas.mensajeId, mensajeId));

    const preguntas = (mensaje.preguntas as Pregunta[]) ?? [];
    const porPregunta = new Map<string, typeof filas>();
    for (const f of filas) {
      const lista = porPregunta.get(f.preguntaId) ?? [];
      lista.push(f);
      porPregunta.set(f.preguntaId, lista);
    }

    return {
      mensajeId: mensaje.id,
      titulo: mensaje.titulo,
      totalRespondieron: new Set(filas.map((f) => f.usuarioId)).size,
      preguntas: preguntas.map((p) => {
        const respuestasPregunta = porPregunta.get(p.id) ?? [];
        if (p.tipo === 'texto_breve') {
          return {
            id: p.id,
            tipo: p.tipo,
            texto: p.texto,
            respuestas: respuestasPregunta.map((r) => ({
              respuesta: r.respuesta,
              organizacion: r.organizacionNombre,
              fecha: r.createdAt,
            })),
          };
        }
        const conteos: Record<string, number> = {};
        for (const r of respuestasPregunta) conteos[r.respuesta] = (conteos[r.respuesta] ?? 0) + 1;
        return { id: p.id, tipo: p.tipo, texto: p.texto, opciones: p.opciones, conteos };
      }),
    };
  }
}
