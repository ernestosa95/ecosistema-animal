import { Type } from 'class-transformer';
import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Alta de pago self-service (propietario/admin de la propia organización,
 * ver organizacion.controller.ts). A diferencia de `admin/dto/registrar-pago.dto.ts`
 * no acepta `medioPago` — por ahora la única vía self-service es
 * transferencia, así que el service lo fija directo, no hace falta pedirlo.
 * Viaja como multipart/form-data (junto con el archivo del comprobante), así
 * que todos los campos llegan como string — de ahí el `@Type(() => Number)`
 * en `monto`, si no `@IsNumber()` rechazaría "15000" por no ser un number.
 */
export class RegistrarPagoOrgDto {
  // Mes calendario que cubre el pago, cualquier fecha de ese mes (el service
  // se queda sólo con año/mes). Por defecto el mes actual.
  @IsOptional()
  @IsISO8601()
  periodo?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto!: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
