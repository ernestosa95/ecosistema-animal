import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Evento extends Model {
  static table = 'eventos';

  @text('organizacion_id') organizacionId: string;
  @text('establecimiento_id') establecimientoId: string;
  @text('tipo') tipo: string;
  @text('categoria') categoria: string | null;
  @field('cantidad') cantidad: number | null;
  @text('producto') producto: string | null;
  @text('fecha') fecha: string;
  @text('observaciones') observaciones: string | null;
  @text('usuario_id') usuarioId: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
