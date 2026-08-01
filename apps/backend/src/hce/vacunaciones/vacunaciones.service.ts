import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { vacunaciones, animales } from '../../database/schema';
import { CreateVacunacionDto } from './dto/create-vacunacion.dto';

@Injectable()
export class VacunacionesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async verificarAnimal(organizacionId: string, animalId: string) {
    const [a] = await this.db
      .select({ id: animales.id })
      .from(animales)
      .where(and(eq(animales.id, animalId), eq(animales.organizacionId, organizacionId)))
      .limit(1);
    if (!a) throw new NotFoundException('El paciente no existe en esta organización');
  }

  /** Registra una vacunación aplicada al paciente. */
  async registrar(
    organizacionId: string,
    veterinarioId: string,
    dto: CreateVacunacionDto,
  ) {
    await this.verificarAnimal(organizacionId, dto.animalId);
    const [vacunacion] = await this.db
      .insert(vacunaciones)
      .values({
        organizacionId,
        animalId: dto.animalId,
        veterinarioId,
        producto: dto.producto,
        vademecumId: dto.vademecumId,
        fecha: dto.fecha,
        proximaDosis: dto.proximaDosis,
        loteProducto: dto.loteProducto,
      })
      .returning();
    return vacunacion;
  }

  /** Historial de vacunas de un paciente (de la más reciente a la más antigua). */
  async historiaPorAnimal(organizacionId: string, animalId: string) {
    await this.verificarAnimal(organizacionId, animalId);
    return this.db
      .select()
      .from(vacunaciones)
      .where(
        and(
          eq(vacunaciones.organizacionId, organizacionId),
          eq(vacunaciones.animalId, animalId),
          isNull(vacunaciones.deletedAt),
        ),
      )
      .orderBy(desc(vacunaciones.fecha));
  }

  /**
   * Recordatorios: vacunas cuya próxima dosis vence dentro de los próximos
   * `dias` (o ya venció). Incluye datos del paciente para armar la notificación.
   */
  async recordatorios(organizacionId: string, dias = 30) {
    return this.db
      .select({
        id: vacunaciones.id,
        animalId: vacunaciones.animalId,
        animalNombre: animales.nombre,
        codigoLegible: animales.codigoLegible,
        producto: vacunaciones.producto,
        proximaDosis: vacunaciones.proximaDosis,
        loteProducto: vacunaciones.loteProducto,
      })
      .from(vacunaciones)
      .innerJoin(animales, eq(animales.id, vacunaciones.animalId))
      .where(
        and(
          eq(vacunaciones.organizacionId, organizacionId),
          isNull(vacunaciones.deletedAt),
          isNotNull(vacunaciones.proximaDosis),
          sql`${vacunaciones.proximaDosis} <= current_date + ${dias}::int`,
        ),
      )
      .orderBy(asc(vacunaciones.proximaDosis));
  }
}
