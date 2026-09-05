import { IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CrearPlanDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  // Precio, precio anual y cupo por rol son obligatorios al crear un plan —
  // a diferencia de ActualizarPlanDto (PATCH), donde todo sigue opcional
  // porque una edición puede tocar un solo campo (ej. sólo `activo`).
  @IsNumber()
  @Min(0)
  precioMensual!: number;

  @IsNumber()
  @Min(0)
  precioAnual!: number;

  /** Cupo máximo por rol, ej. { veterinario: 2, recepcion: 0 }. Sin excepciones: la web siempre manda los 5 roles. */
  @IsObject()
  limitesRoles!: Record<string, number>;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
