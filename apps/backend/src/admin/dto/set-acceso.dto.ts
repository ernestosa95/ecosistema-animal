import { IsBoolean, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class SetAccesoDto {
  @IsOptional()
  @IsUUID()
  grupoId?: string | null;

  @IsOptional()
  @IsUUID()
  planId?: string | null;

  @IsOptional()
  @IsISO8601()
  accesoHasta?: string | null;

  @IsOptional()
  @IsISO8601()
  fechaActivacion?: string | null;

  @IsOptional()
  @IsBoolean()
  esDemo?: boolean;
}
