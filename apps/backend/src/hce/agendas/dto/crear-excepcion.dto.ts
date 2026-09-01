import { IsDateString, IsIn, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Excepción puntual a una fecha concreta de una agenda: 'cierre' (feriado,
 * licencia — sin horaInicio/horaFin es el día completo, con ellas es una
 * franja parcial) o 'apertura_extra' (ventana fuera del horario recurrente,
 * requiere horaInicio/horaFin).
 */
export class CrearExcepcionDto {
  @IsDateString()
  fecha!: string;

  @IsIn(['cierre', 'apertura_extra'])
  tipo!: 'cierre' | 'apertura_extra';

  @ValidateIf((o) => o.tipo === 'apertura_extra' || o.horaInicio !== undefined)
  @Matches(HORA_HHMM, { message: 'horaInicio debe tener formato HH:MM' })
  horaInicio?: string;

  @ValidateIf((o) => o.tipo === 'apertura_extra' || o.horaFin !== undefined)
  @Matches(HORA_HHMM, { message: 'horaFin debe tener formato HH:MM' })
  horaFin?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
