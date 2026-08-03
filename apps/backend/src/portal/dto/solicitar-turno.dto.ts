import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class SolicitarTurnoDto {
  @IsUUID()
  animalId!: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  /** Fecha preferida por el dueño (YYYY-MM-DD o ISO). */
  @IsDateString()
  fechaPreferida!: string;
}
