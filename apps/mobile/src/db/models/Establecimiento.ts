import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Establecimiento extends Model {
  static table = 'establecimientos';

  @text('organizacion_id') organizacionId: string;
  @text('nombre') nombre: string;
  @text('ubicacion') ubicacion: string | null;
  @field('superficie_ha') superficieHa: number | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
