import { join } from 'node:path';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DbErrorFilter } from './common/filters/db-error.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Archivos subidos por los propios usuarios (hoy sólo la foto de perfil
  // del animal, cargada desde el portal) — filesystem local, no hay
  // servicio de storage externo configurado. `uploads/` está gitignoreado.
  // Relativo a process.cwd() (= apps/backend, tanto en `start:dev` como en
  // `start:prod`), NO a __dirname: en dev, `nest start --watch` corre el JS
  // compilado en dist/, así que __dirname ahí adentro apunta a dist/ — las
  // fotos quedarían escritas en dist/uploads/ y se perderían en el próximo
  // rebuild. Mismo criterio que ya usa scripts/init-local-db.mjs para
  // DATABASE_PATH (relativo a cwd, no a __dirname).
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Validación automática de DTOs en toda la API
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // CORS para las apps web y móvil. Sin CORS_ORIGIN (dev local) queda abierto
  // a cualquier origen, como siempre; en prod completar con el/los dominios
  // reales separados por coma (ej. "https://app.tudominio.com") — la app
  // mobile no manda header Origin, así que no necesita estar en esta lista.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors(corsOrigin ? { origin: corsOrigin.split(',').map((o) => o.trim()) } : undefined);

  // Traduce errores de id inválido (uuid) en 404 en vez de 500
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new DbErrorFilter(httpAdapter));

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`Backend del ecosistema escuchando en http://localhost:${port}`);
}
bootstrap();
