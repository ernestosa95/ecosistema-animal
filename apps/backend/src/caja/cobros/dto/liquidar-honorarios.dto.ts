import { IsDateString, IsUUID } from 'class-validator';

export class LiquidarHonorariosDto {
  @IsUUID()
  veterinarioId!: string;

  @IsDateString()
  desde!: string;

  @IsDateString()
  hasta!: string;
}
