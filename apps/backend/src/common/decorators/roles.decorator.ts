import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a ciertos roles de membresía. Ej: @Roles('propietario','admin') */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
