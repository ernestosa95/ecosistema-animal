import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CrearPlanDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
