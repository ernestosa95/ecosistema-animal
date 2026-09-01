import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class ActualizarAgendaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  /** null = quitar el profesional asignado (queda como agenda sin profesional). */
  @IsOptional()
  @IsUUID()
  usuarioId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  duracionTurnoMinutos?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
