import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Reset de contraseña por un admin/propietario.
 * - Si viene `nuevaPassword`, se usa esa.
 * - Si no viene, el servidor genera una temporal y la devuelve (una sola vez).
 */
export class ResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  nuevaPassword?: string;
}
