import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  HttpException,
  HttpStatus,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Raw body capture — webhook HMAC imza doğrulaması için gerekli.
  // Fastify varsayılan JSON parser'ının önüne geçer, raw body'yi req.rawBody'ye yazar.
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req: any, body: Buffer, done: any) => {
    try {
      (_req as any).rawBody = body; // Buffer olarak sakla
      done(null, JSON.parse(body.toString('utf8')));
    } catch (e) {
      done(e, null);
    }
  });

  // Register fastify multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  });

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const extractErrors = (validationErrors: ValidationError[]) => {
          return validationErrors.flatMap((error, index) => {
            const mainError = error.constraints
              ? `${index + 1} ${error.property} alanı hatalı: ${Object.values(error.constraints).join(', ')}`
              : null;
            const childErrors = error.children?.length
              ? extractErrors(error.children)
              : [];

            return [mainError, ...childErrors].filter(Boolean);
          });
        };

        const messages = extractErrors(errors);
        return new HttpException(messages, HttpStatus.BAD_REQUEST);
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('API documentation with Swagger')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 8080, '0.0.0.0');
}
bootstrap();
