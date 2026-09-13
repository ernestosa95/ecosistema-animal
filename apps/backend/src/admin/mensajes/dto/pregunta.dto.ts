import { ArrayMinSize, IsArray, IsIn, IsString, MinLength, ValidateIf } from 'class-validator';

const TIPOS_PREGUNTA = ['si_no', 'opcion_multiple', 'texto_breve'] as const;

export class PreguntaDto {
  @IsIn(TIPOS_PREGUNTA)
  tipo!: (typeof TIPOS_PREGUNTA)[number];

  @IsString()
  @MinLength(2)
  texto!: string;

  /** Sólo para 'opcion_multiple' — el usuario elige una sola, ver MensajesBanner.tsx. */
  @ValidateIf((o) => o.tipo === 'opcion_multiple')
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  opciones?: string[];
}
