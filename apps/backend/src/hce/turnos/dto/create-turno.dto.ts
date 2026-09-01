import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * Alta de turno.
 *
 *  - `agendaId` (opcional): agenda a la que se asigna el turno — si viene, el
 *    horario se valida contra los slots de esa agenda (rechaza fuera de
 *    horario u ocupado). Sin agenda, el turno sigue siendo 100% libre.
 *  - `estado` (opcional): cuando el turno se carga desde el mostrador ya sale
 *    'confirmado'; los que entran por el portal del dueño quedan 'solicitado'
 *    (valor por defecto en el service).
 */
export class CreateTurnoDto {
  @IsUUID()
  animalId!: string;

  /** ISO 8601, ej: '2026-08-07T10:30:00'. */
  @IsISO8601()
  fechaHora!: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  /** 'portal' | 'telefono' | 'mostrador'. Por defecto 'portal'. */
  @IsOptional()
  @IsString()
  canal?: string;

  /** Agenda (hce.agendas.id) a la que se asigna el turno. */
  @IsOptional()
  @IsUUID()
  agendaId?: string;

  /** Solo se admite alta en 'solicitado' o 'confirmado'. */
  @IsOptional()
  @IsIn(['solicitado', 'confirmado'])
  estado?: 'solicitado' | 'confirmado';
}