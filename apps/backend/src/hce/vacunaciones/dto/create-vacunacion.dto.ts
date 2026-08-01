import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateVacunacionDto {
  @IsUUID()
  animalId!: string;

  @IsString()
  @IsNotEmpty()
  producto!: string;

  @IsOptional()
  @IsUUID()
  vademecumId?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsDateString()
  proximaDosis?: string;

  @IsOptional()
  @IsString()
  loteProducto?: string;
}
