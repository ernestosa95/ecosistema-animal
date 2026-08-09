import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Expone los miembros (usuarios con membresía activa) de la organización.
 * Necesario para asignar turnos a un profesional. No crea usuarios: el alta
 * sigue viviendo en `auth`.
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
