import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  /** Meses gratis al arrancar (ej. "3 meses bonificados") — 0 = sin bonificación. */
  @IsOptional()
  @IsInt()
  @Min(0)
  mesesBonificados?: number;
}
