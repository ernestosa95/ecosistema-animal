import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MailModule } from '../common/mail/mail.module';

/**
 * Administración de plataforma (super-admin): alta de organizaciones y de sus
 * miembros. Vive fuera del tenant de cualquier organización. MailModule
 * aporta el envío de recordatorios de pago.
 */
@Module({
  imports: [AuthModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService, JwtAuthGuard, SuperAdminGuard],
})
export class AdminModule {}
