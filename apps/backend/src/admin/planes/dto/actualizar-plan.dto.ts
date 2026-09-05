import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ActualizarPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioMensual?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioAnual?: number | null;

  /** Cupo máximo por rol, ej. { veterinario: 2, recepcion: 1 }. Un rol ausente = sin límite. */
  @IsOptional()
  @IsObject()
  limitesRoles?: Record<string, number>;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
