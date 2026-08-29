import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Animal extends Model {
  static table = 'animales';

  @text('organizacion_id') organizacionId: string;
  @text('persona_id') personaId: string | null;
  @text('especie_id') especieId: string;
  @text('codigo_legible') codigoLegible: string | null;
  @text('microchip') microchip: string | null;
  @text('nombre') nombre: string;
  @text('sexo') sexo: string | null;
  @text('fecha_nacimiento') fechaNacimiento: string | null;
  @field('fecha_nac_estimada') fechaNacEstimada: boolean;
  @text('foto_url') fotoUrl: string | null;
  @text('estado') estado: string;
  @text('datos_especificos') datosEspecificos: string;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
