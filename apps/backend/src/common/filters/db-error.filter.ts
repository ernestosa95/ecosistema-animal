import { ArgumentsHost, Catch, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * Traduce el error de Postgres "invalid input syntax for type uuid" (código 22P02)
 * en un 404 limpio, en lugar del 500 genérico que se veía al pasar un id inválido.
 * Cualquier otra excepción sigue su curso normal.
 */
@Catch()
export class DbErrorFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const msg = String(exception?.message ?? '');
    if (exception?.code === '22P02' || /invalid input syntax for type uuid/i.test(msg)) {
      return super.catch(new NotFoundException('Recurso no encontrado'), host);
    }
    return super.catch(exception, host);
  }
}
