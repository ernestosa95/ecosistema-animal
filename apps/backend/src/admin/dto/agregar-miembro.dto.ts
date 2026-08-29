import { ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const ROLES = ['propietario', 'admin', 'capataz', 'veterinario', 'recepcion'];

export class AgregarMiembroDto {
  @IsEmail()
  email!: string;

  /** Roles apilables: un miembro puede tener más de uno (ej. recepción + veterinario). */
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLES, { each: true })
  roles!: string[];

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  /** Requerida solo si el usuario es nuevo (se valida en el service). */
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
