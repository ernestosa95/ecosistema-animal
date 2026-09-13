import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
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

  // Obligatorio, mismo criterio que CreateConsultaDto.costo (2026-09-03):
  // toda vacunación cargada desde ahora tiene que dejar registrado un costo,
  // aunque sea 0 (cortesía).
  @IsNumber()
  @Min(0)
  costo!: number;
}
