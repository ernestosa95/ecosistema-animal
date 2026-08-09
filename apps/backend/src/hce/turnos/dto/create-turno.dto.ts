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
 * Cambios respecto de la versión anterior:
 *  - `veterinarioId` (opcional): permite asignar el turno a un profesional
 *    de la veterinaria en el momento de crearlo (antes solo se podía en
 *    `PATCH /turnos/:id/estado`).
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

  /** Profesional (core.usuarios.id) al que se asigna el turno. */
  @IsOptional()
  @IsUUID()
  veterinarioId?: string;

  /** Solo se admite alta en 'solicitado' o 'confirmado'. */
  @IsOptional()
  @IsIn(['solicitado', 'confirmado'])
  estado?: 'solicitado' | 'confirmado';
}