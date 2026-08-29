import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { existencias } from '../../database/schema';
import { EstablecimientosService } from '../establecimientos/establecimientos.service';
import { CATEGORIAS_HACIENDA, SetExistenciaDto } from './dto/set-existencia.dto';

@Injectable()
export class ExistenciasService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly establecimientos: EstablecimientosService,
  ) {}

  /** Existencias del establecimiento, completando en 0 las categorías sin cargar. */
  async listar(organizacionId: string, establecimientoId: string) {
    await this.establecimientos.obtener(organizacionId, establecimientoId); // valida pertenencia

    const filas = await this.db
      .select({ categoria: existencias.categoria, cantidad: existencias.cantidad })
      .from(existencias)
      .where(
        and(
          eq(existencias.establecimientoId, establecimientoId),
          eq(existencias.organizacionId, organizacionId),
        ),
      );

    const porCategoria = new Map(filas.map((f) => [f.categoria, f.cantidad]));
    return CATEGORIAS_HACIENDA.map((categoria) => ({
      categoria,
      cantidad: porCategoria.get(categoria) ?? 0,
    }));
  }

  /**
   * Existencias de TODOS los establecimientos de la organización, sin
   * completar categorías en 0 (a diferencia de `listar`) — es para que el
   * panel consolidado arme la matriz cruzando esto con la lista de
   * establecimientos, no hace falta rellenar acá.
   */
  listarTodas(organizacionId: string) {
    return this.db
      .select({
        establecimientoId: existencias.establecimientoId,
        categoria: existencias.categoria,
        cantidad: existencias.cantidad,
      })
      .from(existencias)
      .where(eq(existencias.organizacionId, organizacionId));
  }

  /** Fija la cantidad de una categoría (upsert manual: no hay constraint compuesta en la tabla). */
  async fijar(organizacionId: string, establecimientoId: string, dto: SetExistenciaDto) {
    await this.establecimientos.obtener(organizacionId, establecimientoId); // valida pertenencia

    const [existente] = await this.db
      .select({ id: existencias.id })
      .from(existencias)
      .where(
        and(
          eq(existencias.establecimientoId, establecimientoId),
          eq(existencias.organizacionId, organizacionId),
          eq(existencias.categoria, dto.categoria),
        ),
      )
      .limit(1);

    if (existente) {
      await this.db
        .update(existencias)
        .set({ cantidad: dto.cantidad, updatedAt: new Date() })
        .where(eq(existencias.id, existente.id));
    } else {
      await this.db.insert(existencias).values({
        organizacionId,
        establecimientoId,
        categoria: dto.categoria,
        cantidad: dto.cantidad,
      });
    }

    return { categoria: dto.categoria, cantidad: dto.cantidad };
  }
}
