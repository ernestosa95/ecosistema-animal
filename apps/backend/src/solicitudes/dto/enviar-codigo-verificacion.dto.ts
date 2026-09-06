import { IsEmail } from 'class-validator';

export class EnviarCodigoVerificacionDto {
  @IsEmail()
  email!: string;
}
