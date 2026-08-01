import { Module } from '@nestjs/common';
import { EspeciesService } from './especies.service';
import { EspeciesController } from './especies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EspeciesController],
  providers: [EspeciesService],
})
export class EspeciesModule {}
