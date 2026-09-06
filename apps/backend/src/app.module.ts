import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './core/auth/auth.module';
import { EspeciesModule } from './core/especies/especies.module';
import { PersonasModule } from './core/personas/personas.module';
import { AnimalesModule } from './core/animales/animales.module';
import { HceModule } from './hce/hce.module';
import { PortalModule } from './portal/portal.module';
import { AdminModule } from './admin/admin.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { UsuariosModule } from './core/usuarios/usuarios.module';
import { OrganizacionModule } from './core/organizacion/organizacion.module';
import { TroperaModule } from './tropera/tropera.module';
import { FarmaciaModule } from './farmacia/farmacia.module';
import { SyncModule } from './sync/sync.module';
import { PlanesModule } from './admin/planes/planes.module';
import { GruposModule } from './admin/grupos/grupos.module';
import { MensajesAdminModule } from './admin/mensajes/mensajes-admin.module';
import { MensajesModule } from './mensajes/mensajes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CajaModule } from './caja/caja.module';
import { AnaliticaModule } from './analitica/analitica.module';
import { HealthModule } from './health/health.module';

/**
 * Módulo raíz. Registra todos los módulos del ecosistema.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Límite general de toda la API (100 req/min por IP) — generoso a
    // propósito, no es el que protege login/forgot-password/reset-password
    // (esos tienen su propio límite más estricto vía @Throttle, ver
    // auth.controller.ts). Sólo existe para que un guard global esté
    // disponible sin tener que declarar uno por endpoint sensible a mano.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    EspeciesModule,
    PersonasModule,
    AnimalesModule,
    HceModule,
    PortalModule,
    AdminModule,
    SolicitudesModule,
    UsuariosModule,
    OrganizacionModule,
    TroperaModule,
    FarmaciaModule,
    SyncModule,
    PlanesModule,
    GruposModule,
    MensajesAdminModule,
    MensajesModule,
    DashboardModule,
    CajaModule,
    AnaliticaModule,
    HealthModule,
  ],
  providers: [Reflector, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
