import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CrearOrganizacionDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsBoolean()
  huellaActiva?: boolean;

  @IsOptional()
  @IsBoolean()
  troperaActiva?: boolean;

  @IsOptional()
  @IsString()
  cuit?: string;
}
