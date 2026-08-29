import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { PlanesController } from './planes.controller';
import { PlanesService } from './planes.service';

@Module({
  imports: [AuthModule],
  controllers: [PlanesController],
  providers: [PlanesService, JwtAuthGuard, SuperAdminGuard],
})
export class PlanesModule {}
