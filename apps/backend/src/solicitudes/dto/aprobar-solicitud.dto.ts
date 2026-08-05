import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class AprobarSolicitudDto {
  // Requerido para 'unirse': la veterinaria destino (la elige el admin).
  @IsOptional() @IsUUID()
  organizacionId?: string;

  // Rol a asignar (para 'unirse'). Por defecto 'veterinario'.
  @IsOptional() @IsIn(['propietario', 'admin', 'capataz', 'veterinario', 'recepcion'])
  rol?: string;
}

export class RechazarSolicitudDto {
  @IsOptional() @IsString()
  motivo?: string;
}
