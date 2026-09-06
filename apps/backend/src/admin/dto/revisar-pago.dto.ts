import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RevisarPagoDto {
  @IsBoolean()
  aprobar!: boolean;

  @IsOptional()
  @IsString()
  motivoRechazo?: string;
}
