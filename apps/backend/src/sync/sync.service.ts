import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { pull, push } from './sync.core';

@Injectable()
export class SyncService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  pull(organizacionId: string, lastPulledAt?: number) {
    return pull(this.db, organizacionId, lastPulledAt);
  }

  push(organizacionId: string, changes: Record<string, any>) {
    return push(this.db, organizacionId, changes);
  }
}
