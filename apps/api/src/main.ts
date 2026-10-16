import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { StorageService } from './integrations/storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, rawBody: true });
  const cfg = app.get(ConfigService).get<AppConfig>('app')!;

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({ origin: cfg.corsOrigins.length ? cfg.corsOrigins : false, credentials: true });
  app.set('trust proxy', 1);
  const storage = app.get(StorageService);
  if (storage.isLocal) {
    // Dev-only local media. Cross-origin embedding is allowed so the web app and mobile app can render these images.
    app.useStaticAssets(storage.localRoot, { prefix: '/uploads', maxAge: '1y', setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin') });
  }
  app.setGlobalPrefix('api', { exclude: ['c/:handle'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Reccora API').setDescription('Creator-led shopping platform').setVersion('1').addBearerAuth().build(),
  );
  SwaggerModule.setup('docs', app, doc);

  await app.listen(cfg.port, '0.0.0.0');
}
bootstrap();
