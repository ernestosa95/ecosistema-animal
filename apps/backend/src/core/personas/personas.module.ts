import { Module } from '@nestjs/common';
import { PersonasService } from './personas.service';
import { PersonasController } from './personas.controller';
import { AuthModule } from '../auth/auth.module';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Module({
  imports: [AuthModule],
  controllers: [PersonasController],
  providers: [PersonasService, TenantGuard],
  exports: [PersonasService],
})
export class PersonasModule {}
