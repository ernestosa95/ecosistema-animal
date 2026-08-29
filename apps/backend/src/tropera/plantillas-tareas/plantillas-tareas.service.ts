import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { plantillasTareas, plantillaItems, establecimientos, animalesCampo, eventos } from '../../database/schema';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';
import { AplicarPlantillaDto } from './dto/aplicar-plantilla.dto';

@Injectable()
export class PlantillasTareasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async crear(organizacionId: string, dto: CreatePlantillaDto) {
    return this.db.transaction(async (tx) => {
      const [plantilla] = await tx
        .insert(plantillasTareas)
        .values({ organizacionId, nombre: dto.nombre })
        .returning();

      const items = await tx
        .insert(plantillaItems)
        .values(dto.items.map((item, i) => ({ plantillaId: plantilla.id, tipo: item.tipo, producto: item.producto, orden: i })))
        .returning();

      return { ...plantilla, items };
    });
  }

  async listar(organizacionId: string) {
    const propias = await this.db
      .select()
      .from(plantillasTareas)
      .where(and(eq(plantillasTareas.organizacionId, organizacionId), isNull(plantillasTareas.deletedAt)))
      .orderBy(asc(plantillasTareas.nombre));

    return Promise.all(
      propias.map(async (plantilla) => {
        const items = await this.db
          .select()
          .from(plantillaItems)
          .where(eq(plantillaItems.plantillaId, plantilla.id))
          .orderBy(asc(plantillaItems.orden));
        return { ...plantilla, items };
      }),
    );
  }

  async eliminar(organizacionId: string, id: string) {
    const [plantilla] = await this.db
      .select({ id: plantillasTareas.id })
      .from(plantillasTareas)
      .where(and(eq(plantillasTareas.id, id), eq(plantillasTareas.organizacionId, organizacionId)))
      .limit(1);
    if (!plantilla) throw new NotFoundException('Plantilla no encontrada');
    await this.db
      .update(plantillasTareas)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(plantillasTareas.id, id));
    return { ok: true };
  }

  /** Aplica la plantilla a un animal: crea un evento por cada ítem, todos imputados a ese animal. */
  async aplicar(organizacionId: string, usuarioId: string, plantillaId: string, dto: AplicarPlantillaDto) {
    const [establecimiento] = await this.db
      .select({ id: establecimientos.id })
      .from(establecimientos)
      .where(and(eq(establecimientos.id, dto.establecimientoId), eq(establecimientos.organizacionId, organizacionId)))
      .limit(1);
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado');

    const [animal] = await this.db
      .select({ id: animalesCampo.id })
      .from(animalesCampo)
      .where(and(eq(animalesCampo.id, dto.animalCampoId), eq(animalesCampo.organizacionId, organizacionId)))
      .limit(1);
    if (!animal) throw new NotFoundException('El animal indicado no existe en esta organización');

    const items = await this.db
      .select()
      .from(plantillaItems)
      .where(eq(plantillaItems.plantillaId, plantillaId))
      .orderBy(asc(plantillaItems.orden));
    if (items.length === 0) throw new NotFoundException('Plantilla no encontrada o sin ítems');

    return this.db.transaction(async (tx) => {
      const creados = [];
      for (const item of items) {
        const [evento] = await tx
          .insert(eventos)
          .values({
            organizacionId,
            establecimientoId: dto.establecimientoId,
            animalCampoId: dto.animalCampoId,
            tipo: item.tipo,
            producto: item.producto,
            usuarioId,
          })
          .returning();
        creados.push(evento);
      }
      return creados;
    });
  }
}
