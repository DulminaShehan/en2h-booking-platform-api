import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip any incoming property that has no matching decorator in the DTO...
      whitelist: true,
      // ...and reject the request outright if it tried to send one, instead of
      // silently dropping it — surfaces client bugs/typos immediately.
      forbidNonWhitelisted: true,
      // Auto-convert path/query params and payloads into their DTO's declared
      // types (e.g. "123" -> 123) before validation and handler execution run.
      transform: true,
    }),
  );

  // Global filter, applied last so it also catches errors ValidationPipe itself throws.
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Booking Platform API')
    .setDescription('REST API for managing services, bookings, and users')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
