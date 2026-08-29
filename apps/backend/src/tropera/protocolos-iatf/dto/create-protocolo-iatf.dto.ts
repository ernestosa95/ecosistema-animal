import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProtocoloPasoDto {
  /** Día relativo al "día 0" del protocolo — puede ser negativo (preparación previa). */
  @IsInt()
  diaOffset!: number;

  @IsString()
  @MinLength(1)
  descripcion!: string;

  @IsOptional()
  @IsString()
  producto?: string;
}

export class CreateProtocoloIatfDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProtocoloPasoDto)
  pasos!: ProtocoloPasoDto[];
}
