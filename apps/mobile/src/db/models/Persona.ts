import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Persona extends Model {
  static table = 'personas';

  @text('organizacion_id') organizacionId: string;
  @text('dni') dni: string | null;
  @text('nombre') nombre: string;
  @text('apellido') apellido: string;
  @text('sexo') sexo: string | null;
  @text('fecha_nacimiento') fechaNacimiento: string | null;
  @text('celular') celular: string | null;
  @text('telefono') telefono: string | null;
  @text('email') email: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
