import { IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CrearSolicitudDto {
  @IsIn(['crear', 'unirse'])
  tipo!: 'crear' | 'unirse';

  @IsString() @MinLength(2)
  nombre!: string;

  @IsString() @MinLength(2)
  apellido!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8)
  password!: string;

  @IsOptional() @IsString()
  telefono?: string;

  // Requerido solo si tipo = 'crear'
  @ValidateIf((o) => o.tipo === 'crear')
  @IsString() @MinLength(2)
  nombreOrganizacion?: string;

  @IsOptional() @IsIn(['clinica', 'establecimiento', 'mixta'])
  tipoOrganizacion?: string;

  // Requerido solo si tipo = 'unirse' (nombre de la veterinaria a la que se quiere unir)
  @ValidateIf((o) => o.tipo === 'unirse')
  @IsString() @MinLength(2)
  organizacionSolicitada?: string;
}
