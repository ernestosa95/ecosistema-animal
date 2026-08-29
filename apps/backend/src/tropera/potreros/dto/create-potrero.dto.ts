import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreatePotreroDto {
  @IsUUID()
  establecimientoId!: string;

  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  superficieHa?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacidadCabezas?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
