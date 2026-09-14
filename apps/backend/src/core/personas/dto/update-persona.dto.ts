import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdatePersonaDto {
  // Optional a nivel de "no lo estoy tocando en este PATCH", pero si viene
  // no puede llegar vacío — dni/celular son obligatorios desde el alta, una
  // edición no puede vaciarlos (ver CreatePersonaDto).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dni?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apellido?: string;

  @IsOptional()
  @IsIn(['masculino', 'femenino', 'otro'])
  sexo?: 'masculino' | 'femenino' | 'otro';

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  celular?: string;

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
