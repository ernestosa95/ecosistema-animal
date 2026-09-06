import { ArrayMinSize, IsArray, IsIn } from 'class-validator';

const ROLES = ['propietario', 'admin', 'capataz', 'veterinario', 'recepcion'];

/** Reemplaza el conjunto completo de roles de un miembro (self-service, propietario/admin de la propia organización). */
export class ActualizarRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLES, { each: true })
  roles!: string[];
}
