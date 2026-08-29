import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { establecimientos } from '../../database/schema';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';

@Injectable()
export class EstablecimientosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Da de alta un establecimiento ganadero dentro de la organización activa. */
  async crear(organizacionId: string, dto: CreateEstablecimientoDto) {
    const [establecimiento] = await this.db
      .insert(establecimientos)
      .values({
        organizacionId,
        nombre: dto.nombre,
        ubicacion: dto.ubicacion,
        superficieHa: dto.superficieHa?.toString(),
      })
      .returning();
    return establecimiento;
  }

  /** Lista los establecimientos de la organización activa. */
  listar(organizacionId: string) {
    return this.db
      .select()
      .from(establecimientos)
      .where(
        and(eq(establecimientos.organizacionId, organizacionId), isNull(establecimientos.deletedAt)),
      );
  }

  /** Obtiene un establecimiento, garantizando que pertenezca a la organización activa. */
  async obtener(organizacionId: string, id: string) {
    const [establecimiento] = await this.db
      .select()
      .from(establecimientos)
      .where(
        and(
          eq(establecimientos.id, id),
          eq(establecimientos.organizacionId, organizacionId),
          isNull(establecimientos.deletedAt),
        ),
      )
      .limit(1);
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado');
    return establecimiento;
  }

  /** Actualiza los datos de un establecimiento de la organización activa. */
  async actualizar(organizacionId: string, id: string, dto: UpdateEstablecimientoDto) {
    await this.obtener(organizacionId, id); // valida pertenencia

    const [establecimiento] = await this.db
      .update(establecimientos)
      .set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.ubicacion !== undefined && { ubicacion: dto.ubicacion }),
        ...(dto.superficieHa !== undefined && { superficieHa: dto.superficieHa.toString() }),
        updatedAt: new Date(),
      })
      .where(and(eq(establecimientos.id, id), eq(establecimientos.organizacionId, organizacionId)))
      .returning();

    return establecimiento;
  }
}
