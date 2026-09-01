import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CrearAgendaDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  /** Profesional (core.usuarios.id) dueño de la agenda. Sin valor = agenda sin profesional (ej. peluquería). */
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  duracionTurnoMinutos?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
