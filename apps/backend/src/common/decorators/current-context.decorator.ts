import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Inyecta el payload del usuario autenticado: { sub, email } */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().user,
);

/** Inyecta el id de la organización activa (resuelta por TenantGuard) */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().organizacionId,
);

/** Inyecta los roles del usuario en la organización activa (arreglo, seteado por TenantGuard) */
export const CurrentRol = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().roles,
);
