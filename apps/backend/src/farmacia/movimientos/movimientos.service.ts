import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { movimientosStock, consultas } from '../../database/schema';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';
import { aplicarMovimientoStock } from './aplicar-movimiento-stock';

@Injectable()
export class MovimientosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Registra un movimiento de stock y ajusta `stock` en la misma transacción.
   * compra: suma. uso/vencimiento/merma/venta: resta (rechaza si deja negativo).
   */
  async crear(organizacionId: string, usuarioId: string, dto: CreateMovimientoStockDto) {
    return this.db.transaction(async (tx) => {
      if (dto.consultaId) {
        const [consulta] = await tx
          .select({ id: consultas.id })
          .from(consultas)
          .where(and(eq(consultas.id, dto.consultaId), eq(consultas.organizacionId, organizacionId)))
          .limit(1);
        if (!consulta) throw new NotFoundException('Consulta no encontrada');
      }

      await aplicarMovimientoStock(tx, organizacionId, dto);

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
