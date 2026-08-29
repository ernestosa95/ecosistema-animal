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
}
