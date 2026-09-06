import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

/**
 * Sólo lectura en la práctica (sumada v7): no hay ninguna pantalla en mobile
 * para crear/editar agendas — eso sigue siendo "⚙ Agendas" en Usuarios,
 * sólo web. Se sincroniza nada más para que `Turno.agendaId` pueda
 * resolverse localmente (ver `(app)/turnos.tsx`, "Atender").
 */
export class Agenda extends Model {
  static table = 'agendas';

  @text('organizacion_id') organizacionId: string;
  @text('nombre') nombre: string;
  // null = agenda sin profesional asignado ("no médica", ej. peluquería).
  @text('usuario_id') usuarioId: string | null;
  @field('duracion_turno_minutos') duracionTurnoMinutos: number;
  @text('color') color: string | null;
  @field('activa') activa: boolean;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
