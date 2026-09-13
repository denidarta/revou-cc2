import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import morgan from 'morgan';

/** Swagger UI requests are skipped so docs assets do not flood the log. */
export function skipRequestLog(req: { url?: string }): boolean {
  return req.url?.startsWith('/api/docs') ?? false;
}

export interface AppSetupOptions {
  /** Overrides the morgan output stream; defaults to stdout. */
  logStream?: { write: (message: string) => void };
}

/** Shared HTTP wiring so tests exercise the same setup as `main.ts`. */
export function configureApp(
  app: INestApplication,
  options: AppSetupOptions = {},
): void {
  // CSP is disabled so the Swagger UI at /api/docs can load its inline assets.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      skip: skipRequestLog,
      stream: options.logStream,
    }),
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Q&A Forum API')
    .setDescription('Simple Q&A forum: register, login, and manage threads.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
}
