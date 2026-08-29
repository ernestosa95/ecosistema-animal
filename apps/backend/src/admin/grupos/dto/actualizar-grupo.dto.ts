import { IsOptional, IsString, MinLength } from 'class-validator';

export class ActualizarGrupoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
