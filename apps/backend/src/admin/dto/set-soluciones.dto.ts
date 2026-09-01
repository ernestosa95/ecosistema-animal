import { IsBoolean } from 'class-validator';

/** Activar/desactivar por separado las dos soluciones del ecosistema para una organización. */
export class SetSolucionesDto {
  @IsBoolean()
  huellaActiva!: boolean;

  @IsBoolean()
  troperaActiva!: boolean;
}
