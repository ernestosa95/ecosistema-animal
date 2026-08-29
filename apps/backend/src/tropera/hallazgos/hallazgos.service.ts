import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { hallazgos } from '../../database/schema';
import { HALLAZGOS_DEFAULT } from './hallazgos-default';
import { CreateHallazgoDto } from './dto/create-hallazgo.dto';

@Injectable()
export class HallazgosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Siembra lazy del catálogo default, igual que MacrosService.listar(). */
  async listar(organizacionId: string): Promise<(typeof hallazgos.$inferSelect)[]> {
    const propios = await this.db
      .select()
      .from(hallazgos)
      .where(and(eq(hallazgos.organizacionId, organizacionId), isNull(hallazgos.deletedAt)));

    if (propios.length === 0) {
      await this.db.insert(hallazgos).values(HALLAZGOS_DEFAULT.map((nombre) => ({ organizacionId, nombre })));
      return this.listar(organizacionId);
    }
    return propios;
  }

  async crear(organizacionId: string, dto: CreateHallazgoDto) {
    const [hallazgo] = await this.db.insert(hallazgos).values({ organizacionId, nombre: dto.nombre }).returning();
    return hallazgo;
  }

  async eliminar(organizacionId: string, id: string) {
    const [hallazgo] = await this.db
      .select({ id: hallazgos.id })
      .from(hallazgos)
      .where(and(eq(hallazgos.id, id), eq(hallazgos.organizacionId, organizacionId)))
      .limit(1);
    if (!hallazgo) throw new NotFoundException('Hallazgo no encontrado');
    await this.db.update(hallazgos).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(hallazgos.id, id));
    return { ok: true };
  }
}
