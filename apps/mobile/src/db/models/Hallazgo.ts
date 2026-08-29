import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Hallazgo extends Model {
  static table = 'hallazgos';

  @text('organizacion_id') organizacionId: string;
  @text('nombre') nombre: string;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
