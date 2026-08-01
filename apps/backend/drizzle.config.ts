import { defineConfig } from 'drizzle-kit';

/**
 * Genera y aplica migraciones a partir de los schemas Drizzle.
 * Las migraciones se versionan en db/migrations/ (raíz del monorepo).
 */
export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: '../../db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
