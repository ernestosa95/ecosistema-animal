import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CrearOrganizacionDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsIn(['establecimiento', 'clinica', 'mixta'])
  tipo?: 'establecimiento' | 'clinica' | 'mixta';

  @IsOptional()
  @IsString()
  cuit?: string;
}
