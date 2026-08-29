import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export const TIPOS_MOVIMIENTO_STOCK = ['compra', 'uso', 'vencimiento', 'merma', 'venta'] as const;
export type TipoMovimientoStock = (typeof TIPOS_MOVIMIENTO_STOCK)[number];

export class CreateMovimientoStockDto {
  @IsUUID()
  productoId!: string;

  @IsIn(TIPOS_MOVIMIENTO_STOCK)
  tipo!: TipoMovimientoStock;

  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  /** Sólo para dispensas (F4.3): la consulta que originó este uso del producto. */
  @IsOptional()
  @IsUUID()
  consultaId?: string;
}
