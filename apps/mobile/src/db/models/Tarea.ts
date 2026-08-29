import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Tarea extends Model {
  static table = 'tareas';

  @text('organizacion_id') organizacionId: string;
  @text('establecimiento_id') establecimientoId: string;
  @text('animal_campo_id') animalCampoId: string | null;
  @text('protocolo_id') protocoloId: string | null;
  @text('descripcion') descripcion: string;
  @text('producto') producto: string | null;
  @text('fecha_programada') fechaProgramada: string;
  @text('estado') estado: string;
  @text('observaciones') observaciones: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
