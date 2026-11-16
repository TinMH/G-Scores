import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

/** App-wide configuration shared by main.ts and the e2e tests. */
export function configureApp(app: NestExpressApplication): void {
  app.set('trust proxy', true); // behind nginx + ingress: rate-limit by real client IP
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
}
