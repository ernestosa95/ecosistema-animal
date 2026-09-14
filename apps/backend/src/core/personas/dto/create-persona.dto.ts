import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreatePersonaDto {
  // Obligatorio: además de dato de contacto, es el marcador para evitar
  // dueños duplicados (ver PersonasService.crear(), único por organización).
  @IsString()
  @IsNotEmpty()
  dni!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @IsOptional()
  @IsIn(['masculino', 'femenino', 'otro'])
  sexo?: 'masculino' | 'femenino' | 'otro';

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  // Obligatorio: es el canal de contacto real con el dueño (WhatsApp del
  // portal, recordatorios) — sin esto la organización no tiene forma de
  // avisarle nada.
  @IsString()
  @IsNotEmpty()
  celular!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  domicilio?: string;
}
