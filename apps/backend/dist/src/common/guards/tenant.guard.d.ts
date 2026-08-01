import { CanActivate, ExecutionContext } from '@nestjs/common';
import { DrizzleDB } from '../../database/drizzle.provider';
export declare class TenantGuard implements CanActivate {
    private readonly db;
    constructor(db: DrizzleDB);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
