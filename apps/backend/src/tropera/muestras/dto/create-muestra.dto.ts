import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMuestraDto {
  @IsUUID()
  establecimientoId!: string;

  @IsInt()
  @Min(1)
  tuboNumero!: number;

  /** Si el animal ya está cargado individualmente. */
  @IsOptional()
  @IsUUID()
  animalCampoId?: string;

  /** Si no hay `animalCampoId`: registrar la caravana igual, de texto libre. */
  @IsOptional()
  @IsString()
  caravana?: string;

  @IsOptional()
  @IsString()
  tipoMuestra?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
