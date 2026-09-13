import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CrearInteresadoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  /** Recibe la confirmación automática y es lo que usa el staff para contactar. */
  @IsEmail()
  email!: string;

  /** Opcional — para WhatsApp, no bloquea el alta si no lo deja. */
  @IsOptional()
  @IsString()
  celular?: string;

  @IsString()
  @IsNotEmpty()
  nombreVeterinaria!: string;
}
