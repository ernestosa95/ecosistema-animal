import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DbErrorFilter } from './common/filters/db-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación automática de DTOs en toda la API
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // CORS para las apps web y móvil
  app.enableCors();

  // Traduce errores de id inválido (uuid) en 404 en vez de 500
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new DbErrorFilter(httpAdapter));

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`Backend del ecosistema escuchando en http://localhost:${port}`);
}
bootstrap();
