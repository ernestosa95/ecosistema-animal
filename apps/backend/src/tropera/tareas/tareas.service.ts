import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { tareas } from '../../database/schema';
import { UpdateTareaDto } from './dto/update-tarea.dto';

@Injectable()
export class TareasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Agenda de campo (§5.1/§6.2): tareas programadas, opcionalmente acotadas a establecimiento/animal/estado. */
  listar(organizacionId: string, establecimientoId?: string, animalCampoId?: string, estado?: string) {
    const condiciones = [eq(tareas.organizacionId, organizacionId), isNull(tareas.deletedAt)];
    if (establecimientoId) condiciones.push(eq(tareas.establecimientoId, establecimientoId));
    if (animalCampoId) condiciones.push(eq(tareas.animalCampoId, animalCampoId));
    if (estado) condiciones.push(eq(tareas.estado, estado as (typeof tareas.$inferSelect)['estado']));
    return this.db
      .select()
      .from(tareas)
      .where(and(...condiciones))
      .orderBy(asc(tareas.fechaProgramada));
  }

  async actualizar(organizacionId: string, id: string, dto: UpdateTareaDto) {
    const [tarea] = await this.db
      .select({ id: tareas.id })
      .from(tareas)
      .where(and(eq(tareas.id, id), eq(tareas.organizacionId, organizacionId)))
      .limit(1);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    const [actualizada] = await this.db
      .update(tareas)
      .set({
        estado: dto.estado,
        ...(dto.observaciones !== undefined && { observaciones: dto.observaciones }),
        updatedAt: new Date(),
      })
      .where(eq(tareas.id, id))
      .returning();
    return actualizada;
  }
}
