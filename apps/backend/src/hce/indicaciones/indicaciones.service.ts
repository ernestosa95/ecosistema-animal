import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { indicaciones, consultas, productos } from '../../database/schema';
import { CreateIndicacionDto } from './dto/create-indicacion.dto';
import { UpdateIndicacionDto } from './dto/update-indicacion.dto';

@Injectable()
export class IndicacionesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Verifica la consulta y devuelve su animalId (server-side, no se confía en lo que mande el cliente). */
  private async animalDeConsulta(organizacionId: string, consultaId: string) {
    const [consulta] = await this.db
      .select({ animalId: consultas.animalId })
      .from(consultas)
      .where(and(eq(consultas.id, consultaId), eq(consultas.organizacionId, organizacionId)))
      .limit(1);
    if (!consulta) throw new NotFoundException('La consulta no existe en esta organización');
    return consulta.animalId;
  }

  async crear(organizacionId: string, dto: CreateIndicacionDto) {
    const animalId = await this.animalDeConsulta(organizacionId, dto.consultaId);

    if (dto.origen === 'stock_interno') {
      const [producto] = await this.db
        .select({ id: productos.id })
        .from(productos)
        .where(and(eq(productos.id, dto.productoId!), eq(productos.organizacionId, organizacionId)))
        .limit(1);
      if (!producto) throw new BadRequestException('El producto no existe en esta organización');
    }

    const [indicacion] = await this.db
      .insert(indicaciones)
      .values({
        organizacionId,
        consultaId: dto.consultaId,
        animalId,
        origen: dto.origen,
        productoId: dto.origen === 'stock_interno' ? dto.productoId : undefined,
        productoNombre: dto.origen === 'receta_externa' ? dto.productoNombre : undefined,
        dosis: dto.dosis,
        cantidadStock: dto.origen === 'stock_interno' ? dto.cantidadStock : undefined,
        frecuencia: dto.frecuencia,
        duracionDias: dto.duracionDias,
        observaciones: dto.observaciones,
      })
      .returning();

    return indicacion;
  }

  async listarPorAnimal(organizacionId: string, animalId: string) {
    return this.db
      .select()
      .from(indicaciones)
      .where(
        and(
          eq(indicaciones.organizacionId, organizacionId),
          eq(indicaciones.animalId, animalId),
          isNull(indicaciones.deletedAt),
        ),
      )
      .orderBy(desc(indicaciones.createdAt));
  }

  async listarPorConsulta(organizacionId: string, consultaId: string) {
    return this.db
      .select()
      .from(indicaciones)
      .where(
        and(
          eq(indicaciones.organizacionId, organizacionId),
          eq(indicaciones.consultaId, consultaId),
          isNull(indicaciones.deletedAt),
        ),
      )
      .orderBy(desc(indicaciones.createdAt));
  }

  private async obtener(organizacionId: string, id: string) {
    const [indicacion] = await this.db
      .select()
      .from(indicaciones)
      .where(
        and(eq(indicaciones.id, id), eq(indicaciones.organizacionId, organizacionId), isNull(indicaciones.deletedAt)),
      )
      .limit(1);
    if (!indicacion) throw new NotFoundException('Indicación no encontrada');
    return indicacion;
  }

  async actualizar(organizacionId: string, id: string, dto: UpdateIndicacionDto) {
    await this.obtener(organizacionId, id);
    const [indicacion] = await this.db
      .update(indicaciones)
      .set({ ...(dto.activo !== undefined && { activo: dto.activo }), updatedAt: new Date() })
      .where(and(eq(indicaciones.id, id), eq(indicaciones.organizacionId, organizacionId)))
      .returning();
    return indicacion;
  }

  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.db
      .update(indicaciones)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(indicaciones.id, id), eq(indicaciones.organizacionId, organizacionId)));
    return { ok: true };
  }
}
