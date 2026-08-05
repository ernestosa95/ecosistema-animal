import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * Administración de plataforma (super-admin): alta de veterinarias y de sus
 * miembros. Vive fuera del tenant de cualquier organización.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, JwtAuthGuard, SuperAdminGuard],
})
export class AdminModule {}
