import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CATEGORIAS_HACIENDA, CategoriaHacienda } from '../../existencias/dto/set-existencia.dto';

export const ESTADOS_ANIMAL_CAMPO = ['activo', 'vendido', 'muerto', 'transferido'] as const;
export type EstadoAnimalCampo = (typeof ESTADOS_ANIMAL_CAMPO)[number];

export class UpdateAnimalCampoDto {
  @IsOptional()
  @IsIn(CATEGORIAS_HACIENDA)
  categoria?: CategoriaHacienda;

  @IsOptional()
  @IsString()
  sexo?: string;

  @IsOptional()
  @IsIn(ESTADOS_ANIMAL_CAMPO)
  estado?: EstadoAnimalCampo;

  /** Fase E, §5.3: "Apartados Rápidos" — reasignar el potrero es este mismo PATCH. Null limpia la asignación. */
  @IsOptional()
  @IsUUID()
  potreroId?: string | null;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
