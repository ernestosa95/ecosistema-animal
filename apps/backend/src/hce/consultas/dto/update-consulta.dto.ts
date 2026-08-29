import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateConsultaDto {
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
}
