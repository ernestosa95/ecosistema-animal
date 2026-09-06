import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

// Alta offline sumada 2026-09-02 (acceso rápido "Nuevo turno" del Home) —
// antes era sólo lectura. Sigue sin motor de SLOTS (eso es un concepto
// online de la web, `agenda_bloques`/`agenda_excepciones`, no sincronizado a
// este dispositivo): un turno cargado offline no valida colisión de
// horario, se resuelve recién al sincronizar. Desde v7 sí sincroniza
// `agenda_id` (ver modelo `Agenda`) — sólo para saber si la agenda tiene
// profesional asignado, no para armar/editar horarios acá. "Atender" (ver
// `(app)/turnos.tsx`) sí cambia `estado` directo acá, mismo criterio que el
// resto de las altas offline.
export class Turno extends Model {
  static table = 'turnos';

  @text('organizacion_id') organizacionId: string;
  @text('animal_id') animalId: string | null;
  @text('persona_id') personaId: string | null;
  @text('veterinario_id') veterinarioId: string | null;
  @text('agenda_id') agendaId: string | null;
  @date('fecha_hora') fechaHora: Date;
  @text('estado') estado: string;
  @text('motivo') motivo: string | null;
  @text('canal') canal: string | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
