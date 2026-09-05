import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Expone los miembros (usuarios con membresía activa) de la organización.
 * Necesario para asignar turnos a un profesional. También permite el alta
 * self-service de miembros por un propietario/admin de la propia
 * organización (`POST /usuarios`, respeta el cupo del plan) — distinto del
 * alta vía `/admin` (`AdminService.agregarMiembro`), que es del super-admin
 * de plataforma y no pasa por `TenantGuard`.
 *
 * Importa AuthModule porque el controller usa JwtAuthGuard, que a su vez
 * depende de JwtService. Ese servicio no es global: hay que traerlo del módulo
 * que lo exporta (el mismo que importan personas/animales).
 */
@Module({
  imports: [AuthModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
