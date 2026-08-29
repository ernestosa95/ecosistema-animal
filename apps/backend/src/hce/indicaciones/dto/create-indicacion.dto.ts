import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator';

const ORIGENES = ['stock_interno', 'receta_externa'] as const;
export type OrigenIndicacion = (typeof ORIGENES)[number];

export class CreateIndicacionDto {
  @IsUUID()
  consultaId!: string;

  @IsIn(ORIGENES)
  origen!: OrigenIndicacion;

  @ValidateIf((o) => o.origen === 'stock_interno')
  @IsUUID()
  productoId?: string;

  @ValidateIf((o) => o.origen === 'receta_externa')
  @IsString()
  productoNombre?: string;

  @IsOptional()
  @IsString()
  dosis?: string;

  @ValidateIf((o) => o.origen === 'stock_interno')
  @IsInt()
  @Min(1)
  cantidadStock?: number;

  @IsOptional()
  @IsString()
  frecuencia?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionDias?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
