import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateCobroDto {
  @IsString()
  @MinLength(1)
  concepto!: string;

  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  /** A quién se le imputa el cobro, para la liquidación de honorarios (§4.4). */
  @IsOptional()
  @IsUUID()
  veterinarioId?: string;

  /** Si el cobro corresponde a la venta de un producto de Farmacia (§2.5). */
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsUUID()
  consultaId?: string;
}
