import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateConsultaDto {
  @IsUUID()
  animalId!: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  anamnesis?: string;

  @IsOptional()
  @IsString()
  examenFisico?: string;

  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsOptional()
  @IsString()
  tratamiento?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  pesoKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  temperaturaC?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  // Obligatorio a pedido del negocio (2026-09-03): toda consulta cargada
  // desde ahora tiene que dejar registrado un costo, aunque sea 0 (cortesía).
  @IsNumber()
  @Min(0)
  costo!: number;
}
