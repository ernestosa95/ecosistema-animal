import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Existencia extends Model {
  static table = 'existencias';

  @text('organizacion_id') organizacionId: string;
  @text('establecimiento_id') establecimientoId: string;
  @text('categoria') categoria: string;
  @field('cantidad') cantidad: number;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
