import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  presentacion?: string;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  concentracion?: number;

  @IsOptional()
  @IsString()
  unidadConcentracion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dosisSugeridaMgKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;
}
