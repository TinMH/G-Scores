import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true); // behind nginx + ingress: rate-limit by real client IP
  app.setGlobalPrefix('api');
  app.enableCors();
  app.enableShutdownHooks(); // graceful shutdown on SIGTERM from K8s
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('G-Scores API').setVersion('1.0').build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
