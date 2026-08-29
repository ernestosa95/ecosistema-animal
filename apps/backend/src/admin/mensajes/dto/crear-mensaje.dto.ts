import { IsIn, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class CrearMensajeDto {
  @IsString()
  @MinLength(2)
  titulo!: string;

  @IsString()
  @MinLength(2)
  cuerpo!: string;

  @IsIn(['todas', 'organizacion', 'grupo'])
  destinatarioTipo!: 'todas' | 'organizacion' | 'grupo';

  @ValidateIf((o) => o.destinatarioTipo === 'organizacion')
  @IsUUID()
  organizacionId?: string;

  @ValidateIf((o) => o.destinatarioTipo === 'grupo')
  @IsUUID()
  grupoId?: string;
}
