import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { MensajesAdminController } from './mensajes-admin.controller';
import { MensajesAdminService } from './mensajes-admin.service';

@Module({
  imports: [AuthModule],
  controllers: [MensajesAdminController],
  providers: [MensajesAdminService, JwtAuthGuard, SuperAdminGuard],
})
export class MensajesAdminModule {}
