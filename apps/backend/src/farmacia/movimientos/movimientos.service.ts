import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { productos, stock, movimientosStock, consultas } from '../../database/schema';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';

const TIPOS_ALTA = new Set(['compra']);

@Injectable()
export class MovimientosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Registra un movimiento de stock y ajusta `stock` en la misma transacción.
   * compra: suma. uso/vencimiento/merma: resta (rechaza si deja negativo).
   */
  async crear(organizacionId: string, usuarioId: string, dto: CreateMovimientoStockDto) {
    const esAlta = TIPOS_ALTA.has(dto.tipo);
    const delta = esAlta ? dto.cantidad : -dto.cantidad;

    return this.db.transaction(async (tx) => {
      const [producto] = await tx
        .select({ id: productos.id })
        .from(productos)
        .where(and(eq(productos.id, dto.productoId), eq(productos.organizacionId, organizacionId)))
        .limit(1);
      if (!producto) throw new NotFoundException('Producto no encontrado');

      if (dto.consultaId) {
        const [consulta] = await tx
          .select({ id: consultas.id })
          .from(consultas)
          .where(and(eq(consultas.id, dto.consultaId), eq(consultas.organizacionId, organizacionId)))
          .limit(1);
        if (!consulta) throw new NotFoundException('Consulta no encontrada');
      }

      const [existente] = await tx
        .select({ id: stock.id, cantidad: stock.cantidad })
        .from(stock)
        .where(and(eq(stock.productoId, dto.productoId), eq(stock.organizacionId, organizacionId)))
        .limit(1);

      const actual = existente?.cantidad ?? 0;
      const nueva = actual + delta;
      if (nueva < 0) {
        throw new BadRequestException(
          `No hay suficiente stock de este producto (hay ${actual}, se pidió descontar ${dto.cantidad}).`,
        );
      }

      if (existente) {
        await tx.update(stock).set({ cantidad: nueva, updatedAt: new Date() }).where(eq(stock.id, existente.id));
      } else {
        await tx.insert(stock).values({ organizacionId, productoId: dto.productoId, cantidad: nueva });
      }

      const [movimiento] = await tx
        .insert(movimientosStock)
        .values({
          organizacionId,
          productoId: dto.productoId,
          tipo: dto.tipo,
          cantidad: dto.cantidad,
          fecha: dto.fecha,
          observaciones: dto.observaciones,
          consultaId: dto.consultaId,
          usuarioId,
        })
        .returning();

      return movimiento;
    });
  }

  /** Historial de movimientos de stock de la organización, opcionalmente acotado a un producto y/o consulta. */
  listar(organizacionId: string, productoId?: string, consultaId?: string) {
    const condiciones = [eq(movimientosStock.organizacionId, organizacionId)];
    if (productoId) condiciones.push(eq(movimientosStock.productoId, productoId));
    if (consultaId) condiciones.push(eq(movimientosStock.consultaId, consultaId));
    return this.db
      .select()
      .from(movimientosStock)
      .where(and(...condiciones))
      .orderBy(desc(movimientosStock.fecha), desc(movimientosStock.createdAt));
  }
}
