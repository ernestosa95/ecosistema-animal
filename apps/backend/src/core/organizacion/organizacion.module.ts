import { Module } from '@nestjs/common';
import { OrganizacionController } from './organizacion.controller';
import { OrganizacionService } from './organizacion.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Self-service de plan/pagos para la propia organización (propietario/
 * admin) — ver organizacion.controller.ts. Importa AuthModule porque el
 * controller usa JwtAuthGuard (depende de JwtService, no es global).
 */
@Module({
  imports: [AuthModule],
  controllers: [OrganizacionController],
  providers: [OrganizacionService],
})
export class OrganizacionModule {}
