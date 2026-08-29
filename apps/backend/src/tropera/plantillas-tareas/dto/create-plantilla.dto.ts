import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const TIPOS_EVENTO = ['vacunacion', 'desparasitacion', 'tratamiento', 'servicio', 'diagnostico_prenez', 'destete'] as const;

export class PlantillaItemDto {
  @IsIn(TIPOS_EVENTO)
  tipo!: (typeof TIPOS_EVENTO)[number];

  @IsOptional()
  @IsString()
  producto?: string;
}

export class CreatePlantillaDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlantillaItemDto)
  items!: PlantillaItemDto[];
}
