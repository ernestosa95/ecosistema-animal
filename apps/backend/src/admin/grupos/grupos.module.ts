import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';

@Module({
  imports: [AuthModule],
  controllers: [GruposController],
  providers: [GruposService, JwtAuthGuard, SuperAdminGuard],
})
export class GruposModule {}
