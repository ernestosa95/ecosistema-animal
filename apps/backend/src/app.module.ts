import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './core/auth/auth.module';
import { EspeciesModule } from './core/especies/especies.module';
import { PersonasModule } from './core/personas/personas.module';
import { AnimalesModule } from './core/animales/animales.module';
import { HceModule } from './hce/hce.module';

/**
 * Módulo raíz. A medida que sumemos features se importan aquí:
 * TroperaModule, ...
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    EspeciesModule,
    PersonasModule,
    AnimalesModule,
    HceModule,
  ],
})
export class AppModule {}
