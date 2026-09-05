import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Stock extends Model {
  static table = 'stock';

  @text('organizacion_id') organizacionId: string;
  @text('producto_id') productoId: string;
  @field('cantidad') cantidad: number;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
