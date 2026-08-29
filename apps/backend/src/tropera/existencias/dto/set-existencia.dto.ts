import { IsIn, IsInt, Min } from 'class-validator';

/** Espejo de tropera.categoria_hacienda (database/schema/tropera.ts). */
export const CATEGORIAS_HACIENDA = [
  'vaca',
  'toro',
  'ternero',
  'ternera',
  'vaquillona',
  'novillo',
] as const;

export type CategoriaHacienda = (typeof CATEGORIAS_HACIENDA)[number];

export class SetExistenciaDto {
  @IsIn(CATEGORIAS_HACIENDA)
  categoria!: CategoriaHacienda;

  @IsInt()
  @Min(0)
  cantidad!: number;
}
