import { Equals, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class CrearSolicitudDto {
  // El form público ya sólo ofrece "crear cuenta nueva" — 'unirse' (unirse a
  // una organización existente) se sacó de la UI, pero el campo se deja
  // fijo en 'crear' (en vez de borrarlo del DTO/schema) para no romper
  // solicitudes 'unirse' que ya estén pendientes de aprobación.
  @IsIn(['crear'])
  tipo!: 'crear';

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

  // Prueba de que este email se verificó con el código de 6 dígitos antes de
  // llegar acá (JWT stateless, `scope: 'email_verificado'`, ver
  // SolicitudesService.enviarCodigoVerificacion()/confirmarCodigoVerificacion()
  // — se valida que el email embebido coincida con el de arriba).
  @IsString() @MinLength(10)
  emailVerificadoToken!: string;

  // Datos filiatorios de quien solicita la cuenta — antes opcionales, ahora
  // obligatorios (a pedido del negocio: hace falta poder contactar/
  // identificar a quien pide el alta antes de aprobarla).
  @IsString() @MinLength(6)
  telefono!: string;

  @IsString() @MinLength(6)
  dni!: string;

  // Plan al que se quiere unir la organización — obligatorio (tipo siempre
  // es 'crear' ahora). Se valida que exista y esté disponible para altas
  // nuevas en SolicitudesService.crear() (mismo criterio que AdminService.
  // setAcceso() usa para asignaciones manuales).
  @IsUUID()
  planId!: string;

  @IsString() @MinLength(2)
  nombreOrganizacion!: string;

  @IsOptional() @IsIn(['clinica', 'establecimiento', 'mixta'])
  tipoOrganizacion?: string;

  // Datos de la institución/campo — sólo tienen sentido si tipo = 'crear'.
  // Localidad/provincia pasaron a obligatorias (a pedido del negocio, mismo
  // motivo que telefono/dni arriba); dirección/teléfono/email de la
  // institución siguen opcionales.
  @IsOptional() @IsString()
  direccionOrganizacion?: string;

  @IsString() @MinLength(2)
  localidadOrganizacion!: string;

  // Texto libre a nivel DB/DTO — el <select> de provincias en el web es una
  // restricción sólo de UI (mismo criterio que categoria/unidad/presentacion
  // de farmacia), no vale la pena un @IsIn acá.
  @IsString() @MinLength(2)
  provinciaOrganizacion!: string;

  @IsOptional() @IsString()
  telefonoOrganizacion?: string;

  @IsOptional() @IsEmail()
  emailOrganizacion?: string;

  // Requerido solo si tipo = 'unirse' (nombre de la veterinaria a la que se quiere unir)
  @ValidateIf((o) => o.tipo === 'unirse')
  @IsString() @MinLength(2)
  organizacionSolicitada?: string;
}
