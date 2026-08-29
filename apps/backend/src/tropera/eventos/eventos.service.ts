import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { establecimientos, eventos } from '../../database/schema';
import { CreateEventoDto } from './dto/create-evento.dto';

@Injectable()
export class EventosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Registra un evento sanitario/reproductivo. No ajusta existencias (a diferencia de un movimiento). */
  async crear(organizacionId: string, usuarioId: string, dto: CreateEventoDto) {
    const [establecimiento] = await this.db
      .select({ id: establecimientos.id })
      .from(establecimientos)
      .where(
        and(
          eq(establecimientos.id, dto.establecimientoId),
          eq(establecimientos.organizacionId, organizacionId),
          isNull(establecimientos.deletedAt),
        ),
      )
      .limit(1);
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado');

    const [evento] = await this.db
      .insert(eventos)
      .values({
        organizacionId,
        establecimientoId: dto.establecimientoId,
        tipo: dto.tipo,
        categoria: dto.categoria,
        cantidad: dto.cantidad,
        producto: dto.producto,
        fecha: dto.fecha,
        observaciones: dto.observaciones,
        usuarioId,
      })
      .returning();

    return evento;
  }

  /** Historial de eventos de la organización, opcionalmente acotado a un establecimiento. */
  listar(organizacionId: string, establecimientoId?: string) {
    const condiciones = [eq(eventos.organizacionId, organizacionId)];
    if (establecimientoId) {
      condiciones.push(eq(eventos.establecimientoId, establecimientoId));
    }
    return this.db
      .select()
      .from(eventos)
      .where(and(...condiciones))
      .orderBy(desc(eventos.fecha), desc(eventos.createdAt));
  }
}
