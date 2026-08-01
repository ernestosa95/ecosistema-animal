"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drizzleProvider = exports.DRIZZLE = void 0;
const config_1 = require("@nestjs/config");
const schema = require("./schema");
exports.DRIZZLE = Symbol('DRIZZLE');
exports.drizzleProvider = {
    provide: exports.DRIZZLE,
    inject: [config_1.ConfigService],
    useFactory: async (config) => {
        const driver = config.get('databaseDriver') ?? 'node-postgres';
        if (driver === 'pglite') {
            const { PGlite } = await Promise.resolve().then(() => require('@electric-sql/pglite'));
            const { drizzle } = await Promise.resolve().then(() => require('drizzle-orm/pglite'));
            const path = config.get('databasePath');
            const client = new PGlite(path);
            return drizzle(client, { schema });
        }
        const { Pool } = await Promise.resolve().then(() => require('pg'));
        const { drizzle } = await Promise.resolve().then(() => require('drizzle-orm/node-postgres'));
        const pool = new Pool({ connectionString: config.get('databaseUrl') });
        return drizzle(pool, { schema });
    },
};
//# sourceMappingURL=drizzle.provider.js.map