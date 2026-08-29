import { IsString, MinLength } from 'class-validator';

/** Bandeja de Conciliación (§5.2): asigna la caravana definitiva a un animal dado de alta como transitorio. */
export class ConciliarAnimalCampoDto {
  @IsString()
  @MinLength(1)
  caravana!: string;
}
