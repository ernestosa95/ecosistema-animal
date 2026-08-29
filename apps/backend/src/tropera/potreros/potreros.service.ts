import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { potreros, establecimientos } from '../../database/schema';
import { CreatePotreroDto } from './dto/create-potrero.dto';
import { UpdatePotreroDto } from './dto/update-potrero.dto';

@Injectable()
export class PotrerosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async verificarEstablecimiento(organizacionId: string, establecimientoId: string) {
    const [establecimiento] = await this.db
      .select({ id: establecimientos.id })
      .from(establecimientos)
      .where(
        and(
          eq(establecimientos.id, establecimientoId),
          eq(establecimientos.organizacionId, organizacionId),
          isNull(establecimientos.deletedAt),
        ),
      )
      .limit(1);
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado');
  }

  async crear(organizacionId: string, dto: CreatePotreroDto) {
    await this.verificarEstablecimiento(organizacionId, dto.establecimientoId);
    const [potrero] = await this.db
      .insert(potreros)
      .values({
        organizacionId,
        establecimientoId: dto.establecimientoId,
        nombre: dto.nombre,
        superficieHa: dto.superficieHa?.toString(),
        capacidadCabezas: dto.capacidadCabezas,
        observaciones: dto.observaciones,
      })
      .returning();
    return potrero;
  }

  listar(organizacionId: string, establecimientoId?: string) {
    const condiciones = [eq(potreros.organizacionId, organizacionId), isNull(potreros.deletedAt)];
    if (establecimientoId) condiciones.push(eq(potreros.establecimientoId, establecimientoId));
    return this.db
      .select()
      .from(potreros)
      .where(and(...condiciones))
      .orderBy(asc(potreros.nombre));
  }

  private async obtener(organizacionId: string, id: string) {
    const [potrero] = await this.db
      .select()
      .from(potreros)
      .where(and(eq(potreros.id, id), eq(potreros.organizacionId, organizacionId), isNull(potreros.deletedAt)))
      .limit(1);
    if (!potrero) throw new NotFoundException('Potrero no encontrado');
    return potrero;
  }

  async actualizar(organizacionId: string, id: string, dto: UpdatePotreroDto) {
    await this.obtener(organizacionId, id);
    const [potrero] = await this.db
      .update(potreros)
      .set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.superficieHa !== undefined && { superficieHa: dto.superficieHa.toString() }),
        ...(dto.capacidadCabezas !== undefined && { capacidadCabezas: dto.capacidadCabezas }),
        ...(dto.observaciones !== undefined && { observaciones: dto.observaciones }),
        updatedAt: new Date(),
      })
      .where(and(eq(potreros.id, id), eq(potreros.organizacionId, organizacionId)))
      .returning();
    return potrero;
  }

  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.db
      .update(potreros)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(potreros.id, id));
    return { ok: true };
  }
}
