import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import * as schema from './schema';
export declare const DRIZZLE: unique symbol;
export type DrizzleDB = NodePgDatabase<typeof schema>;
export declare const drizzleProvider: {
    provide: symbol;
    inject: (typeof ConfigService)[];
    useFactory: (config: ConfigService) => Promise<DrizzleDB>;
};
