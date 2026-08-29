import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class ToroVirtual extends Model {
  static table = 'toros_virtuales';

  @text('organizacion_id') organizacionId: string;
  @text('nombre') nombre: string;
  @text('raza') raza: string | null;
  @text('proveedor') proveedor: string | null;
  @text('observaciones') observaciones: string | null;
  @field('activo') activo: boolean;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
