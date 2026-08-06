import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

/**
 * Portal público: no usa guards, así que NO necesita AuthModule.
 * El provider DRIZZLE es global (DatabaseModule), el service lo inyecta solo.
 * Importar este módulo una sola vez (en HceModule o AppModule).
 */
@Module({
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
