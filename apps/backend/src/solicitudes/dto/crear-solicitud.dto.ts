import { Equals, IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CrearSolicitudDto {
  @IsIn(['crear', 'unirse'])
  tipo!: 'crear' | 'unirse';

  // Checkbox obligatorio del form de alta — @Equals(true) rechaza tanto
  // `false` como que falte el campo directamente.
  @Equals(true, { message: 'Tenés que aceptar los términos y condiciones para crear una cuenta' })
  terminosAceptados!: boolean;

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

  @IsOptional() @IsString()
  dni?: string;

  // Requerido solo si tipo = 'crear'
  @ValidateIf((o) => o.tipo === 'crear')
  @IsString() @MinLength(2)
  nombreOrganizacion?: string;

  @IsOptional() @IsIn(['clinica', 'establecimiento', 'mixta'])
  tipoOrganizacion?: string;

  // Datos de la institución/campo — sólo tienen sentido si tipo = 'crear',
  // todos opcionales (no todas las instituciones tienen los cinco datos a mano).
  @IsOptional() @IsString()
  direccionOrganizacion?: string;

  @IsOptional() @IsString()
  localidadOrganizacion?: string;

  @IsOptional() @IsString()
  provinciaOrganizacion?: string;

  @IsOptional() @IsString()
  telefonoOrganizacion?: string;

  @IsOptional() @IsEmail()
  emailOrganizacion?: string;

  // Requerido solo si tipo = 'unirse' (nombre de la veterinaria a la que se quiere unir)
  @ValidateIf((o) => o.tipo === 'unirse')
  @IsString() @MinLength(2)
  organizacionSolicitada?: string;
}
