/**
 * Carga tipada de variables de entorno.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  // Base de datos
  databaseDriver: process.env.DATABASE_DRIVER ?? 'node-postgres', // 'node-postgres' | 'pglite'
  databaseUrl: process.env.DATABASE_URL,
  databasePath: process.env.DATABASE_PATH, // sólo para pglite (dir persistente)
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
