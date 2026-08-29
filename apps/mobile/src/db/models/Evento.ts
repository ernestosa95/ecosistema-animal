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
  @text('animal_campo_id') animalCampoId: string | null;
  @text('retiro_hasta') retiroHasta: string | null;
  @text('hallazgo_id') hallazgoId: string | null;
  @text('resultado_reproductivo') resultadoReproductivo: string | null;
  @text('toro_virtual_id') toroVirtualId: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
