import { IsIn, IsOptional, IsString } from 'class-validator';

const ESTADOS = ['aceptado', 'en_revision', 'rechazado'] as const;
export type EstadoAuditoriaInput = (typeof ESTADOS)[number];

export class AuditarCajaDto {
  @IsIn(ESTADOS)
  estadoAuditoria!: EstadoAuditoriaInput;

  /** Requerida salvo cuando se acepta el cierre sin objeciones. */
  @IsOptional()
  @IsString()
  observaciones?: string;
}
