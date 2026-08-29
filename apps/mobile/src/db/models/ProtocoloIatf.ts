import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

export class ProtocoloIatf extends Model {
  static table = 'protocolos_iatf';

  @text('organizacion_id') organizacionId: string;
  @text('nombre') nombre: string;
  @text('descripcion') descripcion: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
