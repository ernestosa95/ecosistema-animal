import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { evaluacionesAndrologicas, animalesCampo } from '../../database/schema';
import { CreateEvaluacionAndrologicaDto } from './dto/create-evaluacion-andrologica.dto';

// Umbrales simplificados de aptitud (MVP, §6.2 del spec UI/UX) — no
// reemplazan el criterio clínico del veterinario, sólo dan un cálculo
// automático razonable a partir de los dos valores que pide el spec.
const CIRCUNFERENCIA_MINIMA_CM = 30;
const MOTILIDAD_MINIMA_PORCENTAJE = 50;

@Injectable()
export class EvaluacionesAndrologicasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async crear(organizacionId: string, usuarioId: string, dto: CreateEvaluacionAndrologicaDto) {
    const [animal] = await this.db
      .select({ id: animalesCampo.id })
      .from(animalesCampo)
      .where(and(eq(animalesCampo.id, dto.animalCampoId), eq(animalesCampo.organizacionId, organizacionId)))
      .limit(1);
    if (!animal) throw new NotFoundException('El animal indicado no existe en esta organización');

    const apto =
      dto.circunferenciaEscrotalCm >= CIRCUNFERENCIA_MINIMA_CM && dto.motilidadPorcentaje >= MOTILIDAD_MINIMA_PORCENTAJE;

    const [evaluacion] = await this.db
      .insert(evaluacionesAndrologicas)
      .values({
        organizacionId,
        animalCampoId: dto.animalCampoId,
        circunferenciaEscrotalCm: dto.circunferenciaEscrotalCm.toString(),
        motilidadPorcentaje: dto.motilidadPorcentaje.toString(),
        apto,
        observaciones: dto.observaciones,
        usuarioId,
      })
      .returning();
    return evaluacion;
  }

  listarPorAnimal(organizacionId: string, animalCampoId: string) {
    return this.db
      .select()
      .from(evaluacionesAndrologicas)
      .where(
        and(
          eq(evaluacionesAndrologicas.organizacionId, organizacionId),
          eq(evaluacionesAndrologicas.animalCampoId, animalCampoId),
        ),
      )
      .orderBy(desc(evaluacionesAndrologicas.fecha), desc(evaluacionesAndrologicas.createdAt));
  }
}
