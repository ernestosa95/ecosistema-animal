import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateEvaluacionAndrologicaDto {
  @IsUUID()
  animalCampoId!: string;

  @IsNumber()
  @Min(0)
  circunferenciaEscrotalCm!: number;

  @IsNumber()
  @Min(0)
  motilidadPorcentaje!: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
