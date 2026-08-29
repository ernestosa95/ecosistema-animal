import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdatePotreroDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

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
