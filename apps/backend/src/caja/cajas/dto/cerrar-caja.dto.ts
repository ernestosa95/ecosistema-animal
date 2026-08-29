import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CerrarCajaDto {
  /** Dinero físico contado por el operador al arquear — se compara contra lo calculado por el sistema. */
  @IsNumber()
  @Min(0)
  montoDeclarado!: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
