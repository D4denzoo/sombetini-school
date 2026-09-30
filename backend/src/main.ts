import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression = require('compression');
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { JsonLogger } from './common/logging/json-logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { StorageService } from './storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bufferLogs: true,
    rawBody: true, // needed to verify payment-gateway webhook signatures
  });
  app.useLogger(new JsonLogger());
  const logger = new Logger('bootstrap');

  const configService = app.get(ConfigService);
  assertSecrets(configService);

  // Behind Nginx the client address arrives in X-Forwarded-For; without this, rate limits would
  // count the proxy as one user and lock everyone out together.
  app.set('trust proxy', configService.get<string>('TRUST_PROXY', '1'));
  app.disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: configService.get<string>('NODE_ENV') === 'production' ? { maxAge: 15552000, includeSubDomains: true } : false,
  }));
  app.use(compression());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS', 'http://localhost:3000').split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-Id'],
  });

  // Published files (documents, gallery, notice images). Report cards are NOT here; they are private.
  const storage = app.get(StorageService);
  app.useStaticAssets(storage.uploadsDir, {
    prefix: '/uploads/',
    maxAge: '30d',
    immutable: true,
    index: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    },
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Sombetini Primary School API')
      .setDescription('Digital Platform API for Sombetini Primary School, Tanzania')
      .setVersion('1.1')
      .addBearerAuth()
      .addTag('auth', 'Authentication & authorization')
      .addTag('users', 'User management')
      .addTag('students', 'Student management')
      .addTag('parents', 'Parent portal')
      .addTag('teachers', 'Teacher portal')
      .addTag('results', 'Examination results')
      .addTag('payments', 'Payments & control numbers')
      .addTag('announcements', 'News & announcements')
      .addTag('events', 'School events calendar')
      .addTag('documents', 'Document library')
      .addTag('resources', 'Learning resources')
      .addTag('uploads', 'File uploads')
      .addTag('ai', 'AI Assistant')
      .addTag('admin', 'Administration')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`Sombetini School API running on port ${port}`);
  if (configService.get<string>('NODE_ENV') !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

function assertSecrets(config: ConfigService) {
  const access = config.get<string>('JWT_ACCESS_SECRET') || '';
  const refresh = config.get<string>('JWT_REFRESH_SECRET') || '';
  const weak = (value: string) => value.length < 32 || value.toLowerCase().includes('change_me');
  if (weak(access) || weak(refresh)) {
    throw new Error('JWT secrets are missing or still use the example placeholders. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before starting the API.');
  }
  if (access === refresh) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
  }
  if (config.get<string>('NODE_ENV') === 'production') {
    const dbUrl = config.get<string>('DATABASE_URL') || '';
    if (dbUrl.includes('change_me')) {
      throw new Error('DATABASE_URL still uses the example password. Change it in Postgres and in .env before running in production.');
    }
    const provider = (config.get<string>('PAYMENT_PROVIDER') || 'mock').trim().toLowerCase();
    if (provider !== 'mock') {
      if (!config.get<string>('PAYMENT_API_KEY')?.trim() || !config.get<string>('PAYMENT_WEBHOOK_SECRET')?.trim()) {
        throw new Error('A live payment provider needs PAYMENT_API_KEY and PAYMENT_WEBHOOK_SECRET. Keep PAYMENT_PROVIDER=mock until GePG credentials exist.');
      }
    }
  }
}

bootstrap();
