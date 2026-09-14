import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { planes } from '../../database/schema';
import { CrearPlanDto } from './dto/crear-plan.dto';
import { ActualizarPlanDto } from './dto/actualizar-plan.dto';

@Injectable()
export class PlanesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  listar() {
    return this.db
      .select()
      .from(planes)
      .where(isNull(planes.deletedAt))
      .orderBy(asc(planes.nombre));
  }

  async crear(dto: CrearPlanDto) {
    const [plan] = await this.db
      .insert(planes)
      .values({
        nombre: dto.nombre,
        precioMensual: dto.precioMensual?.toString(),
        precioAnual: dto.precioAnual?.toString(),
        limitesRoles: dto.limitesRoles ?? {},
        descripcion: dto.descripcion,
        mesesBonificados: dto.mesesBonificados ?? 0,
      })
      .returning();
    return plan;
  }

  async actualizar(id: string, dto: ActualizarPlanDto) {
    await this.verificar(id);
    const [plan] = await this.db
      .update(planes)
      .set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.precioMensual !== undefined && { precioMensual: dto.precioMensual?.toString() ?? null }),
        ...(dto.precioAnual !== undefined && { precioAnual: dto.precioAnual?.toString() ?? null }),
        ...(dto.limitesRoles !== undefined && { limitesRoles: dto.limitesRoles }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
        ...(dto.mesesBonificados !== undefined && { mesesBonificados: dto.mesesBonificados }),
        updatedAt: new Date(),
      })
      .where(eq(planes.id, id))
      .returning();
    return plan;
  }

  async eliminar(id: string) {
    await this.verificar(id);
    await this.db.update(planes).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(planes.id, id));
    return { ok: true };
  }

  private async verificar(id: string) {
    const [p] = await this.db
      .select({ id: planes.id })
      .from(planes)
      .where(and(eq(planes.id, id), isNull(planes.deletedAt)))
      .limit(1);
    if (!p) throw new NotFoundException('Plan no encontrado');
  }
}
