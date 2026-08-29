import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { CATEGORIAS_HACIENDA, CategoriaHacienda } from '../../existencias/dto/set-existencia.dto';

export const TIPOS_MOVIMIENTO = ['nacimiento', 'compra', 'muerte', 'venta', 'traslado'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export class CreateMovimientoDto {
  @IsIn(TIPOS_MOVIMIENTO)
  tipo!: TipoMovimiento;

  @IsIn(CATEGORIAS_HACIENDA)
  categoria!: CategoriaHacienda;

  @IsInt()
  @Min(1)
  cantidad!: number;

  /**
   * Establecimiento "actor" del movimiento: origen para muerte/venta/traslado,
   * destino para nacimiento/compra. Es siempre el establecimiento desde cuya
   * página se registra el movimiento.
   */
  @IsUUID()
  establecimientoId!: string;

  /** Sólo para `traslado`: el establecimiento que RECIBE la hacienda. */
  @IsOptional()
  @IsUUID()
  establecimientoDestinoId?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
