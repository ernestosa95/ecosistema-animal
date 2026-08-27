import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AuthModule } from '../core/auth/auth.module';

/**
 * Motor de sincronización offline (WatermelonDB-compatible).
 * Importa AuthModule porque el controller usa JwtAuthGuard (necesita JwtService).
 */
@Module({
  imports: [AuthModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
