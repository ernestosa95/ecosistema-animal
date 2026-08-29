import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Vacunacion extends Model {
  static table = 'vacunaciones';

  @text('organizacion_id') organizacionId: string;
  @text('animal_id') animalId: string;
  @text('veterinario_id') veterinarioId: string | null;
  @text('producto') producto: string | null;
  @text('vademecum_id') vademecumId: string | null;
  @text('fecha') fecha: string;
  @text('proxima_dosis') proximaDosis: string | null;
  @text('lote_producto') loteProducto: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
