import { IsInt, Matches, Max, Min } from 'class-validator';

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Horario recurrente semanal de una agenda, ej. "Lunes (1) de 09:00 a 13:00". */
export class CrearBloqueDto {
  /** 0=domingo .. 6=sábado (Date#getDay()). */
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number;

  @Matches(HORA_HHMM, { message: 'horaInicio debe tener formato HH:MM' })
  horaInicio!: string;

  @Matches(HORA_HHMM, { message: 'horaFin debe tener formato HH:MM' })
  horaFin!: string;
}
