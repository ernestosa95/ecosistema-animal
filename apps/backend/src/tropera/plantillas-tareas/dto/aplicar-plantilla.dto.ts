import { IsUUID } from 'class-validator';

/** Modo Plantilla (§5.1): 1-tap = un animal + una plantilla = todos sus eventos creados de una. */
export class AplicarPlantillaDto {
  @IsUUID()
  animalCampoId!: string;

  @IsUUID()
  establecimientoId!: string;
}
