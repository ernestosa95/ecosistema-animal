import { IsDateString, IsUUID } from 'class-validator';

export class AplicarProtocoloIatfDto {
  @IsUUID()
  animalCampoId!: string;

  @IsUUID()
  establecimientoId!: string;

  /** "Día 0" del protocolo — cada paso genera una tarea en fechaInicio + diaOffset días. */
  @IsDateString()
  fechaInicio!: string;
}
