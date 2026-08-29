import { Injectable, Inject } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { productos, stock } from '../../database/schema';
import { ProductosService } from '../productos/productos.service';
import { SetStockDto } from './dto/set-stock.dto';

@Injectable()
export class StockService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly productos: ProductosService,
  ) {}

  /** Stock de todos los productos activos de la organización (0 si nunca se cargó). */
  listar(organizacionId: string) {
    return this.db
      .select({
        productoId: productos.id,
        nombre: productos.nombre,
        unidad: productos.unidad,
        cantidad: sql<number>`coalesce(${stock.cantidad}, 0)`.mapWith(Number),
      })
      .from(productos)
      .leftJoin(
        stock,
        and(eq(stock.productoId, productos.id), eq(stock.organizacionId, organizacionId)),
      )
      .where(and(eq(productos.organizacionId, organizacionId), eq(productos.activo, true)))
      .orderBy(asc(productos.nombre));
  }

  /** Fija la cantidad de un producto (corrección directa, sin historial — igual criterio que tropera.existencias). */
  async fijar(organizacionId: string, productoId: string, dto: SetStockDto) {
    await this.productos.obtener(organizacionId, productoId); // valida pertenencia

    const [existente] = await this.db
      .select({ id: stock.id })
      .from(stock)
      .where(and(eq(stock.productoId, productoId), eq(stock.organizacionId, organizacionId)))
      .limit(1);

    if (existente) {
      await this.db
        .update(stock)
        .set({ cantidad: dto.cantidad, updatedAt: new Date() })
        .where(eq(stock.id, existente.id));
    } else {
      await this.db.insert(stock).values({ organizacionId, productoId, cantidad: dto.cantidad });
    }

    return { productoId, cantidad: dto.cantidad };
  }
}
