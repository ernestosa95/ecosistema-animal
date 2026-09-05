import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Consulta extends Model {
  static table = 'consultas';

  @text('organizacion_id') organizacionId: string;
  @text('animal_id') animalId: string;
  @text('veterinario_id') veterinarioId: string | null;
  @date('fecha') fecha: Date;
  @text('motivo') motivo: string | null;
  @text('anamnesis') anamnesis: string | null;
  @text('examen_fisico') examenFisico: string | null;
  @text('diagnostico') diagnostico: string | null;
  @text('tratamiento') tratamiento: string | null;
  @field('peso_kg') pesoKg: number | null;
  @field('temperatura_c') temperaturaC: number | null;
  @text('observaciones') observaciones: string | null;
  @field('costo') costo: number | null;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
