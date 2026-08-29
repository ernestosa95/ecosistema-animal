import { ArrayMinSize, IsArray, IsIn } from 'class-validator';

const ROLES = ['propietario', 'admin', 'capataz', 'veterinario', 'recepcion'];

export class SetRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLES, { each: true })
  roles!: string[];
}
