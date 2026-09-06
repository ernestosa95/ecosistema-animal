import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export class CreateAnimalDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsUUID()
  especieId!: string;

  // Obligatorio a propósito: todo animal identificado en Huella tiene que
  // tener un dueño asignado — no existe el concepto de paciente "suelto".
  // El quick-create de dueño inline (nombre/apellido/celular/DNI, ver
  // PacientesPage.tsx/TurnosPage.tsx/SeleccionarAnimalModal.tsx) resuelve un
  // personaId antes de llegar acá, así que igual nunca hace falta dejarlo
  // sin cargar desde el formulario.
  @IsUUID()
  personaId!: string;

  @IsOptional()
  @IsIn(['macho', 'hembra', 'indefinido'])
  sexo?: 'macho' | 'hembra' | 'indefinido';

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsBoolean()
  fechaNacEstimada?: boolean;

  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @IsOptional()
  @IsString()
  microchip?: string;

  /** Datos que dependen de la especie (raza, tamaño, caravana, etc.) */
  @IsOptional()
  @IsObject()
  datosEspecificos?: Record<string, unknown>;
}
