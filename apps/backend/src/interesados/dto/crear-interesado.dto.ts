import { IsNotEmpty, IsString } from 'class-validator';

export class CrearInteresadoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  /** Email o celular, lo que el interesado prefiera dejar — texto libre. */
  @IsString()
  @IsNotEmpty()
  contacto!: string;

  @IsString()
  @IsNotEmpty()
  nombreVeterinaria!: string;
}
