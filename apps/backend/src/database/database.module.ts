import { Global, Module } from '@nestjs/common';
import { drizzleProvider, DRIZZLE } from './drizzle.provider';

/**
 * Módulo global: expone la instancia de Drizzle (token DRIZZLE) a todo el backend.
 */
@Global()
@Module({
  providers: [drizzleProvider],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
