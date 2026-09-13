import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/** Completa el alta (interesado → organización + usuario propietario) desde el link de invitación. */
export class ActivarInteresadoDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  /** Opcional — si no lo cambia, se usa el nombreVeterinaria que ya había dejado. */
  @IsOptional()
  @IsString()
  nombreOrganizacion?: string;
}
