"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    databaseDriver: process.env.DATABASE_DRIVER ?? 'node-postgres',
    databaseUrl: process.env.DATABASE_URL,
    databasePath: process.env.DATABASE_PATH,
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
});
//# sourceMappingURL=configuration.js.map