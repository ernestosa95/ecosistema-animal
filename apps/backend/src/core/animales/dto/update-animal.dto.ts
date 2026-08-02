import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateAnimalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsUUID()
  especieId?: string;

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

  @IsOptional()
  @IsIn(['activo', 'inactivo', 'fallecido'])
  estado?: 'activo' | 'inactivo' | 'fallecido';

  @IsOptional()
  @IsObject()
  datosEspecificos?: Record<string, unknown>;
}
