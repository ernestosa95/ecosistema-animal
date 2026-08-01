import {
  IsDateString,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class UpdateEstadoTurnoDto {
  @IsIn(['confirmado', 'reprogramado', 'cancelado', 'atendido', 'ausente'])
  estado!: 'confirmado' | 'reprogramado' | 'cancelado' | 'atendido' | 'ausente';

  /** Requerido al reprogramar: nueva fecha/hora. */
  @IsOptional()
  @IsDateString()
  fechaHora?: string;

  /** Opcional: asignar/veterinario responsable. */
  @IsOptional()
  @IsUUID()
  veterinarioId?: string;
}
