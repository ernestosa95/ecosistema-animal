import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Potrero extends Model {
  static table = 'potreros';

  @text('organizacion_id') organizacionId: string;
  @text('establecimiento_id') establecimientoId: string;
  @text('nombre') nombre: string;
  @field('superficie_ha') superficieHa: number | null;
  @field('capacidad_cabezas') capacidadCabezas: number | null;
  @text('observaciones') observaciones: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
