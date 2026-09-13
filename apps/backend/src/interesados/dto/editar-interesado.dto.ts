import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** Edición manual desde el panel admin — todos los campos opcionales, sólo se actualiza lo que venga. */
export class EditarInteresadoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  nombreVeterinaria?: string;
}
