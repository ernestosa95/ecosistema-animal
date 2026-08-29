import { IsIn, IsString, MinLength } from 'class-validator';

const CATEGORIAS = ['anamnesis', 'examenFisico', 'diagnostico', 'tratamiento'] as const;
export type CategoriaMacro = (typeof CATEGORIAS)[number];

export class CreateMacroDto {
  @IsIn(CATEGORIAS)
  categoria!: CategoriaMacro;

  @IsString()
  @MinLength(1)
  tag!: string;

  @IsString()
  @MinLength(1)
  texto!: string;
}
