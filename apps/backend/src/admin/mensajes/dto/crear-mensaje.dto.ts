import { IsArray, IsIn, IsOptional, IsString, IsUUID, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PreguntaDto } from './pregunta.dto';

export class CrearMensajeDto {
  @IsString()
  @MinLength(2)
  titulo!: string;

  @IsString()
  @MinLength(2)
  cuerpo!: string;

  @IsIn(['todas', 'organizacion', 'grupo'])
  destinatarioTipo!: 'todas' | 'organizacion' | 'grupo';

  @ValidateIf((o) => o.destinatarioTipo === 'organizacion')
  @IsUUID()
  organizacionId?: string;

  @ValidateIf((o) => o.destinatarioTipo === 'grupo')
  @IsUUID()
  grupoId?: string;

  /** Feedback opcional (sí/no, opción múltiple, texto breve) — ver PreguntaDto. Responder queda a criterio del usuario, ver MensajesBanner.tsx. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreguntaDto)
  preguntas?: PreguntaDto[];
}
