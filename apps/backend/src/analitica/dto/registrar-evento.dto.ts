import { IsIn, IsString, MaxLength } from 'class-validator';

export class RegistrarEventoDto {
  @IsIn(['pantalla', 'accion'])
  tipo!: 'pantalla' | 'accion';

  @IsString()
  @MaxLength(120)
  nombre!: string;
}
