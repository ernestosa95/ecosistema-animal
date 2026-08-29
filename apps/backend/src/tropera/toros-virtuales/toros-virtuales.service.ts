import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { torosVirtuales } from '../../database/schema';
import { CreateToroVirtualDto } from './dto/create-toro-virtual.dto';

@Injectable()
export class TorosVirtualesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  listar(organizacionId: string) {
    return this.db
      .select()
      .from(torosVirtuales)
      .where(
        and(eq(torosVirtuales.organizacionId, organizacionId), eq(torosVirtuales.activo, true), isNull(torosVirtuales.deletedAt)),
      )
      .orderBy(asc(torosVirtuales.nombre));
  }

  async crear(organizacionId: string, dto: CreateToroVirtualDto) {
    const [toro] = await this.db
      .insert(torosVirtuales)
      .values({
        organizacionId,
        nombre: dto.nombre,
        raza: dto.raza,
        proveedor: dto.proveedor,
        observaciones: dto.observaciones,
      })
      .returning();
    return toro;
  }

  async eliminar(organizacionId: string, id: string) {
    const [toro] = await this.db
      .select({ id: torosVirtuales.id })
      .from(torosVirtuales)
      .where(and(eq(torosVirtuales.id, id), eq(torosVirtuales.organizacionId, organizacionId)))
      .limit(1);
    if (!toro) throw new NotFoundException('No encontrado');
    await this.db
      .update(torosVirtuales)
      .set({ activo: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(torosVirtuales.id, id));
    return { ok: true };
  }
}
