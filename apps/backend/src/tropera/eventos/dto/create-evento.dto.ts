import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { CATEGORIAS_HACIENDA, CategoriaHacienda } from '../../existencias/dto/set-existencia.dto';

export const TIPOS_EVENTO = [
  'vacunacion',
  'desparasitacion',
  'tratamiento',
  'servicio',
  'diagnostico_prenez',
  'destete',
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export class CreateEventoDto {
  @IsUUID()
  establecimientoId!: string;

  @IsIn(TIPOS_EVENTO)
  tipo!: TipoEvento;

  /** Opcional: a qué categoría aplica. Sin especificar = todo el establecimiento. */
  @IsOptional()
  @IsIn(CATEGORIAS_HACIENDA)
  categoria?: CategoriaHacienda;

  /** Opcional: cuántos animales fueron afectados. */
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  /** Vacuna aplicada, antiparasitario, etc. */
  @IsOptional()
  @IsString()
  producto?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  /** Fase E: imputa el evento a un animal individual en vez de (o además de) la categoría agregada. */
  @IsOptional()
  @IsUUID()
  animalCampoId?: string;

  /** Fase E, §5.3: fecha hasta la que rige un retiro sanitario/restricción tras este evento. */
  @IsOptional()
  @IsDateString()
  retiroHasta?: string;

  /** Fase E, §6.1: catálogo normalizado en vez de texto libre. */
  @IsOptional()
  @IsUUID()
  hallazgoId?: string;

  /** Fase E, §6.1: sólo tiene sentido en tipo='diagnostico_prenez'. */
  @IsOptional()
  @IsIn(['prenada', 'vacia', 'anestro'])
  resultadoReproductivo?: 'prenada' | 'vacia' | 'anestro';

  /** Fase E, §6.2: sólo tiene sentido en tipo='servicio'. */
  @IsOptional()
  @IsUUID()
  toroVirtualId?: string;
}
