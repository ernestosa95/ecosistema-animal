import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RegistrarPagoDto {
  // Mes calendario que cubre el pago, cualquier fecha de ese mes (el service
  // se queda sólo con año/mes). Por defecto el mes actual.
  @IsOptional()
  @IsISO8601()
  periodo?: string;

  @IsNumber()
  @Min(0)
  monto!: number;

  @IsOptional()
  @IsString()
  medioPago?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
