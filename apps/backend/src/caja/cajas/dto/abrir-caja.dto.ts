import { IsNumber, IsOptional, Min } from 'class-validator';

export class AbrirCajaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoInicial?: number;
}
