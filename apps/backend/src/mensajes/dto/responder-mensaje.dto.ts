import { ArrayMinSize, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RespuestaItemDto {
  @IsString()
  @IsNotEmpty()
  preguntaId!: string;

  /** 'si'/'no', el texto de la opción elegida, o texto libre — según el tipo de la pregunta. */
  @IsString()
  @IsNotEmpty()
  respuesta!: string;
}

export class ResponderMensajeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RespuestaItemDto)
  respuestas!: RespuestaItemDto[];
}
