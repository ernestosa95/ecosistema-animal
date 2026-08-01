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

  @IsOptional()
  @IsUUID()
  personaId?: string;

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
