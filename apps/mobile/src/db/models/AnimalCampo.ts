import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class AnimalCampo extends Model {
  static table = 'animales_campo';

  @text('organizacion_id') organizacionId: string;
  @text('establecimiento_id') establecimientoId: string;
  @text('caravana') caravana: string;
  @field('caravana_definitiva') caravanaDefinitiva: boolean;
  @text('categoria') categoria: string;
  @text('potrero_id') potreroId: string | null;
  @text('sexo') sexo: string | null;
  @text('estado') estado: string;
  @text('fecha_alta') fechaAlta: string;
  @text('observaciones') observaciones: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
