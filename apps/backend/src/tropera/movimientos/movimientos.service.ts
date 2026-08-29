import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { and, desc, eq, gte, lte, or } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { movimientos } from '../../database/schema';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { aplicarMovimiento } from './aplicar-movimiento';

export const TIPOS_ALTA = new Set(['nacimiento', 'compra']);
export const TIPOS_BAJA = new Set(['muerte', 'venta']);

@Injectable()
export class MovimientosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Registra un movimiento y ajusta `existencias` en la misma transacción.
   * nacimiento/compra: suman en establecimientoId. muerte/venta: restan en
   * establecimientoId. traslado: resta en establecimientoId, suma en
   * establecimientoDestinoId.
   */
  async crear(organizacionId: string, usuarioId: string, dto: CreateMovimientoDto) {
    const esAlta = TIPOS_ALTA.has(dto.tipo);
    const esBaja = TIPOS_BAJA.has(dto.tipo);
    const esTraslado = dto.tipo === 'traslado';

    if (esTraslado && !dto.establecimientoDestinoId) {
      throw new BadRequestException('El traslado necesita el establecimiento de destino');
    }
    if (esTraslado && dto.establecimientoDestinoId === dto.establecimientoId) {
      throw new BadRequestException('El destino tiene que ser distinto del establecimiento de origen');
    }
    if (!esTraslado && dto.establecimientoDestinoId) {
      throw new BadRequestException('establecimientoDestinoId sólo aplica a movimientos de tipo traslado');
    }

    const establecimientoOrigenId = esAlta ? undefined : dto.establecimientoId;
    const establecimientoDestinoId = esBaja
      ? undefined
      : (esTraslado ? dto.establecimientoDestinoId : dto.establecimientoId);

    return this.db.transaction(async (tx) => {
      await aplicarMovimiento(tx, organizacionId, {
        categoria: dto.categoria,
        cantidad: dto.cantidad,
        establecimientoOrigenId,
        establecimientoDestinoId,
      });

      const [movimiento] = await tx
        .insert(movimientos)
        .values({
          organizacionId,
          tipo: dto.tipo,
          categoria: dto.categoria,
          cantidad: dto.cantidad,
          establecimientoOrigenId,
          establecimientoDestinoId,
          fecha: dto.fecha,
          observaciones: dto.observaciones,
          usuarioId,
        })
        .returning();

      return movimiento;
    });
  }

  /**
   * Historial de movimientos de la organización, opcionalmente acotado a un
   * establecimiento (origen o destino) y/o a un rango de fechas (drill-down
   * del dashboard, §4.2 — filtra por `createdAt`, el mismo campo que usa
   * `DashboardService` para contar "movimientos este mes por tipo").
   */
  listar(organizacionId: string, establecimientoId?: string, desde?: string, hasta?: string) {
    const condiciones = [eq(movimientos.organizacionId, organizacionId)];
    if (establecimientoId) {
      condiciones.push(
        or(
          eq(movimientos.establecimientoOrigenId, establecimientoId),
          eq(movimientos.establecimientoDestinoId, establecimientoId),
        )!,
      );
    }
    if (desde) condiciones.push(gte(movimientos.createdAt, new Date(desde)));
    if (hasta) condiciones.push(lte(movimientos.createdAt, new Date(hasta)));
    return this.db
      .select()
      .from(movimientos)
      .where(and(...condiciones))
      .orderBy(desc(movimientos.fecha), desc(movimientos.createdAt));
  }
}
