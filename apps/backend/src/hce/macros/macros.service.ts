import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { macros } from '../../database/schema';
import { MACROS_DEFAULT } from './macros-default';
import { CreateMacroDto } from './dto/create-macro.dto';
import { UpdateMacroDto } from './dto/update-macro.dto';

@Injectable()
export class MacrosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Lista las macros de la organización, agrupables por categoría. Si la
   * organización todavía no tiene ninguna (primera vez que las pide), la
   * siembra con el catálogo default antes de responder — lazy e idempotente,
   * sin tocar los flujos de alta de organización.
   */
  async listar(organizacionId: string, categoria?: string): Promise<(typeof macros.$inferSelect)[]> {
    const propias = await this.db
      .select()
      .from(macros)
      .where(and(eq(macros.organizacionId, organizacionId), isNull(macros.deletedAt)));

    if (propias.length === 0) {
      await this.db.insert(macros).values(
        MACROS_DEFAULT.map((m) => ({
          organizacionId,
          categoria: m.categoria,
          tag: m.tag,
          texto: m.texto,
        })),
      );
      return this.listar(organizacionId, categoria);
    }

    return categoria ? propias.filter((m) => m.categoria === categoria) : propias;
  }

  async crear(organizacionId: string, dto: CreateMacroDto) {
    const [macro] = await this.db
      .insert(macros)
      .values({ organizacionId, categoria: dto.categoria, tag: dto.tag, texto: dto.texto })
      .returning();
    return macro;
  }

  private async obtener(organizacionId: string, id: string) {
    const [macro] = await this.db
      .select()
      .from(macros)
      .where(and(eq(macros.id, id), eq(macros.organizacionId, organizacionId), isNull(macros.deletedAt)))
      .limit(1);
    if (!macro) throw new NotFoundException('Macro no encontrada');
    return macro;
  }

  async actualizar(organizacionId: string, id: string, dto: UpdateMacroDto) {
    await this.obtener(organizacionId, id);
    const [macro] = await this.db
      .update(macros)
      .set({
        ...(dto.tag !== undefined && { tag: dto.tag }),
        ...(dto.texto !== undefined && { texto: dto.texto }),
        updatedAt: new Date(),
      })
      .where(and(eq(macros.id, id), eq(macros.organizacionId, organizacionId)))
      .returning();
    return macro;
  }

  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.db
      .update(macros)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(macros.id, id), eq(macros.organizacionId, organizacionId)));
    return { ok: true };
  }
}
