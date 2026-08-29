import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { TroperaModule } from './tropera/tropera.module';
import { FarmaciaModule } from './farmacia/farmacia.module';
import { SyncModule } from './sync/sync.module';
import { PlanesModule } from './admin/planes/planes.module';
import { GruposModule } from './admin/grupos/grupos.module';
import { MensajesAdminModule } from './admin/mensajes/mensajes-admin.module';
import { MensajesModule } from './mensajes/mensajes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CajaModule } from './caja/caja.module';

/**
 * Módulo raíz. Registra todos los módulos del ecosistema.
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
    PortalModule,
    AdminModule,
    SolicitudesModule,
    UsuariosModule,
    TroperaModule,
    FarmaciaModule,
    SyncModule,
    PlanesModule,
    GruposModule,
    MensajesAdminModule,
    MensajesModule,
    DashboardModule,
    CajaModule,
  ],
})
export class AppModule {}
