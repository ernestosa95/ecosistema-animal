import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class MovimientoStock extends Model {
  static table = 'movimientos_stock';

  @text('organizacion_id') organizacionId: string;
  @text('producto_id') productoId: string;
  @text('tipo') tipo: 'compra' | 'uso' | 'vencimiento' | 'merma' | 'venta';
  @field('cantidad') cantidad: number;
  @text('fecha') fecha: string;
  @text('observaciones') observaciones: string | null;
  @text('consulta_id') consultaId: string | null;
  @text('usuario_id') usuarioId: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
