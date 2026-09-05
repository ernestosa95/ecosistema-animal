import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { productos, stock } from '../../database/schema';

const TIPOS_ALTA = new Set(['compra']);

/**
 * Ajusta `stock` para un movimiento ya insertado (compra suma, el resto
 * resta), dentro de la transacción `tx` del caller. Compartida entre
 * `MovimientosService.crear()` (alta online) y el hook `afterCreate` del
 * motor de sync (`sync/sync.core.ts`, alta offline) — mismo criterio que
 * `tropera/movimientos/aplicar-movimiento.ts` para existencias: un único
 * lugar de verdad, incluida la validación de stock negativo.
 */
export async function aplicarMovimientoStock(
  tx: any,
  organizacionId: string,
  mov: { productoId: string; tipo: string; cantidad: number },
): Promise<void> {
  const [producto] = await tx
    .select({ id: productos.id })
    .from(productos)
    .where(and(eq(productos.id, mov.productoId), eq(productos.organizacionId, organizacionId)))
    .limit(1);
  if (!producto) throw new NotFoundException('Producto no encontrado');

  const delta = TIPOS_ALTA.has(mov.tipo) ? mov.cantidad : -mov.cantidad;

  const [existente] = await tx
    .select({ id: stock.id, cantidad: stock.cantidad })
    .from(stock)
    .where(and(eq(stock.productoId, mov.productoId), eq(stock.organizacionId, organizacionId)))
    .limit(1);

  const actual = existente?.cantidad ?? 0;
  const nueva = actual + delta;
  if (nueva < 0) {
    throw new BadRequestException(
      `No hay suficiente stock de este producto (hay ${actual}, se pidió descontar ${mov.cantidad}).`,
    );
  }

  if (existente) {
    await tx.update(stock).set({ cantidad: nueva, updatedAt: new Date() }).where(eq(stock.id, existente.id));
  } else {
    await tx.insert(stock).values({ organizacionId, productoId: mov.productoId, cantidad: nueva });
  }
}
