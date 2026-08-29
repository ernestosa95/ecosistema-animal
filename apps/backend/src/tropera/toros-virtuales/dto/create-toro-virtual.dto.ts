import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateToroVirtualDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsOptional()
  @IsString()
  raza?: string;

  @IsOptional()
  @IsString()
  proveedor?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
