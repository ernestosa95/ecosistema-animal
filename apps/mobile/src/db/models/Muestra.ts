import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Muestra extends Model {
  static table = 'muestras';

  @text('organizacion_id') organizacionId: string;
  @text('establecimiento_id') establecimientoId: string;
  @text('animal_campo_id') animalCampoId: string | null;
  @text('caravana') caravana: string | null;
  @field('tubo_numero') tuboNumero: number;
  @text('tipo_muestra') tipoMuestra: string | null;
  @text('fecha') fecha: string;
  @text('observaciones') observaciones: string | null;
  @text('usuario_id') usuarioId: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
