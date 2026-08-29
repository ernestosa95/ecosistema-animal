import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { mensajes } from '../../database/schema';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';

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

    const [mensaje] = await this.db
      .insert(mensajes)
      .values({
        titulo: dto.titulo,
        cuerpo: dto.cuerpo,
        destinatarioTipo: dto.destinatarioTipo,
        organizacionId: dto.destinatarioTipo === 'organizacion' ? dto.organizacionId : null,
        grupoId: dto.destinatarioTipo === 'grupo' ? dto.grupoId : null,
        creadoPor: usuarioId,
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
}
