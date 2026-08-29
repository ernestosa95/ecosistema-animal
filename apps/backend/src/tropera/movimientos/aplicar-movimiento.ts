import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { establecimientos, existencias } from '../../database/schema';

/**
 * Ajusta `existencias` para un movimiento ya insertado (origen resta,
 * destino suma), dentro de la transacción `tx` del caller. Compartida entre
 * `MovimientosService.crear()` (alta online) y el hook `afterCreate` del
 * motor de sync (`sync/sync.core.ts`, alta offline) — un único lugar de
 * verdad para "cómo un movimiento afecta existencias", incluida la
 * validación de stock negativo.
 */
export async function aplicarMovimiento(
  tx: any,
  organizacionId: string,
  mov: {
    categoria: string;
    cantidad: number;
    establecimientoOrigenId?: string | null;
    establecimientoDestinoId?: string | null;
  },
): Promise<void> {
  const validarPertenencia = async (id: string) => {
    const [e] = await tx
      .select({ id: establecimientos.id })
      .from(establecimientos)
      .where(
        and(
          eq(establecimientos.id, id),
          eq(establecimientos.organizacionId, organizacionId),
          isNull(establecimientos.deletedAt),
        ),
      )
      .limit(1);
    if (!e) throw new NotFoundException('Establecimiento no encontrado');
  };

  const ajustar = async (establecimientoId: string, delta: number) => {
    const [fila] = await tx
      .select({ id: existencias.id, cantidad: existencias.cantidad })
      .from(existencias)
      .where(
        and(
          eq(existencias.establecimientoId, establecimientoId),
          eq(existencias.organizacionId, organizacionId),
          eq(existencias.categoria, mov.categoria as any),
        ),
      )
      .limit(1);

    const actual = fila?.cantidad ?? 0;
    const nueva = actual + delta;
    if (nueva < 0) {
      throw new BadRequestException(
        `No hay suficiente stock de "${mov.categoria}" en el establecimiento de origen (hay ${actual}).`,
      );
    }

    if (fila) {
      await tx
        .update(existencias)
        .set({ cantidad: nueva, updatedAt: new Date() })
        .where(eq(existencias.id, fila.id));
    } else {
      await tx
        .insert(existencias)
        .values({ organizacionId, establecimientoId, categoria: mov.categoria as any, cantidad: nueva });
    }
  };

  if (mov.establecimientoOrigenId) {
    await validarPertenencia(mov.establecimientoOrigenId);
    await ajustar(mov.establecimientoOrigenId, -mov.cantidad);
  }
  if (mov.establecimientoDestinoId) {
    await validarPertenencia(mov.establecimientoDestinoId);
    await ajustar(mov.establecimientoDestinoId, mov.cantidad);
  }
}
