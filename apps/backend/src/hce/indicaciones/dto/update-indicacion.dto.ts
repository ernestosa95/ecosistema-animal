import { IsBoolean, IsOptional } from 'class-validator';

/** Sólo permite togglear `activo` (marcar un esquema como completado/cancelado). */
export class UpdateIndicacionDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
