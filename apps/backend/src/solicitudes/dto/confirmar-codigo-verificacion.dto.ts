import { IsString, Length, MinLength } from 'class-validator';

export class ConfirmarCodigoVerificacionDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsString()
  @Length(6, 6)
  codigo!: string;
}
