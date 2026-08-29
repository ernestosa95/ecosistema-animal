import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

// Sólo lectura desde el mobile en esta iteración — no hay alta ni cambios
// de estado acá, sólo se sincroniza lo que ya existe en el servidor.
export class Turno extends Model {
  static table = 'turnos';

  @text('organizacion_id') organizacionId: string;
  @text('animal_id') animalId: string | null;
  @text('persona_id') personaId: string | null;
  @text('veterinario_id') veterinarioId: string | null;
  @date('fecha_hora') fechaHora: Date;
  @text('estado') estado: string;
  @text('motivo') motivo: string | null;
  @text('canal') canal: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
