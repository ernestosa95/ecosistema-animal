import { Module } from '@nestjs/common';
import { PotrerosController } from './potreros.controller';
import { PotrerosService } from './potreros.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PotrerosController],
  providers: [PotrerosService],
})
export class PotrerosModule {}
