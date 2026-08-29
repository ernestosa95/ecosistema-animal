import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Movimiento extends Model {
  static table = 'movimientos';

  @text('organizacion_id') organizacionId: string;
  @text('tipo') tipo: 'nacimiento' | 'compra' | 'muerte' | 'venta' | 'traslado';
  @text('categoria') categoria: string;
  @field('cantidad') cantidad: number;
  @text('establecimiento_origen_id') establecimientoOrigenId: string | null;
  @text('establecimiento_destino_id') establecimientoDestinoId: string | null;
  @text('fecha') fecha: string;
  @text('observaciones') observaciones: string | null;
  @text('usuario_id') usuarioId: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
