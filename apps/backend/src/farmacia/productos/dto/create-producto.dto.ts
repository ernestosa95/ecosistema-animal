import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

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
  esMedicamento?: boolean;

  @IsOptional()
  @IsBoolean()
  esFraccionable?: boolean;

  // Datos opcionales para la calculadora de dosificación (Fase B) — sólo
  // tienen sentido si esMedicamento.
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCompra?: number;
}
