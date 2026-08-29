import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

export class PlantillaTarea extends Model {
  static table = 'plantillas_tareas';

  @text('organizacion_id') organizacionId: string;
  @text('nombre') nombre: string;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
