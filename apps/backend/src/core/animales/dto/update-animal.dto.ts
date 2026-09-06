import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateAnimalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsUUID()
  especieId?: string;

  // No usa @IsOptional(): esa sólo salta la validación cuando el campo no
  // viene en el body (`undefined`). Acá el caso a cubrir es distinto — un
  // cliente que mande `personaId: null` a propósito para "vaciarle" el dueño
  // a un animal ya identificado, algo que nunca tiene que poder pasar. Con
  // `@ValidateIf` corriendo también sobre `null`, `@IsUUID()` lo rechaza con
  // un 400 en vez de dejarlo pasar como si fuera "no lo toques".
  @ValidateIf((_o, value) => value !== undefined)
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
