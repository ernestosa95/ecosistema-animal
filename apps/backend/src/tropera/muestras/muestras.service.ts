import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, max } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { muestras, establecimientos, animalesCampo } from '../../database/schema';
import { CreateMuestraDto } from './dto/create-muestra.dto';

@Injectable()
export class MuestrasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async crear(organizacionId: string, usuarioId: string, dto: CreateMuestraDto) {
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
        .where(and(eq(animalesCampo.id, dto.animalCampoId), eq(animalesCampo.organizacionId, organizacionId)))
        .limit(1);
      if (!animal) throw new NotFoundException('El animal indicado no existe en esta organización');
    }

    const [muestra] = await this.db
      .insert(muestras)
      .values({
        organizacionId,
        establecimientoId: dto.establecimientoId,
        animalCampoId: dto.animalCampoId,
        caravana: dto.caravana,
        tuboNumero: dto.tuboNumero,
        tipoMuestra: dto.tipoMuestra,
        observaciones: dto.observaciones,
        usuarioId,
      })
      .returning();
    return muestra;
  }

  listar(organizacionId: string, establecimientoId?: string) {
    const condiciones = [eq(muestras.organizacionId, organizacionId), isNull(muestras.deletedAt)];
    if (establecimientoId) condiciones.push(eq(muestras.establecimientoId, establecimientoId));
    return this.db
      .select()
      .from(muestras)
      .where(and(...condiciones))
      .orderBy(desc(muestras.tuboNumero));
  }

  /** Último número de tubo registrado en el establecimiento — el frontend lo usa para sugerir el próximo y alertar sobre saltos. */
  async ultimoTubo(organizacionId: string, establecimientoId: string) {
    const [{ max: ultimo }] = await this.db
      .select({ max: max(muestras.tuboNumero) })
      .from(muestras)
      .where(and(eq(muestras.organizacionId, organizacionId), eq(muestras.establecimientoId, establecimientoId)));
    return { ultimoTubo: ultimo ?? 0 };
  }
}
