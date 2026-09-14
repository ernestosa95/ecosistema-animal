import { IsBoolean } from 'class-validator';

export class ActualizarConfiguracionDto {
  @IsBoolean()
  aprobacionAutomatica!: boolean;
}
