import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { establecimientos, eventos, animalesCampo, hallazgos, torosVirtuales } from '../../database/schema';
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

    if (dto.animalCampoId) {
      const [animal] = await this.db
        .select({ id: animalesCampo.id })
        .from(animalesCampo)
        .where(
          and(eq(animalesCampo.id, dto.animalCampoId), eq(animalesCampo.organizacionId, organizacionId)),
        )
        .limit(1);
      if (!animal) throw new NotFoundException('El animal indicado no existe en esta organización');
    }

    if (dto.hallazgoId) {
      const [hallazgo] = await this.db
        .select({ id: hallazgos.id })
        .from(hallazgos)
        .where(and(eq(hallazgos.id, dto.hallazgoId), eq(hallazgos.organizacionId, organizacionId)))
        .limit(1);
      if (!hallazgo) throw new NotFoundException('El hallazgo indicado no existe en esta organización');
    }

    if (dto.toroVirtualId) {
      const [toro] = await this.db
        .select({ id: torosVirtuales.id })
        .from(torosVirtuales)
        .where(and(eq(torosVirtuales.id, dto.toroVirtualId), eq(torosVirtuales.organizacionId, organizacionId)))
        .limit(1);
      if (!toro) throw new NotFoundException('El toro virtual indicado no existe en esta organización');
    }

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
        animalCampoId: dto.animalCampoId,
        retiroHasta: dto.retiroHasta,
        hallazgoId: dto.hallazgoId,
        resultadoReproductivo: dto.resultadoReproductivo,
        toroVirtualId: dto.toroVirtualId,
      })
      .returning();

    return evento;
  }

  /** Historial de eventos de la organización, opcionalmente acotado a un establecimiento y/o a un animal individual. */
  listar(organizacionId: string, establecimientoId?: string, animalCampoId?: string) {
    const condiciones = [eq(eventos.organizacionId, organizacionId)];
    if (establecimientoId) {
      condiciones.push(eq(eventos.establecimientoId, establecimientoId));
    }
    if (animalCampoId) {
      condiciones.push(eq(eventos.animalCampoId, animalCampoId));
    }
    return this.db
      .select()
      .from(eventos)
      .where(and(...condiciones))
      .orderBy(desc(eventos.fecha), desc(eventos.createdAt));
  }
}
