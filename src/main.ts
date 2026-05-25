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
  // preParsing hook, NestJS'in kendi JSON parser'ına dokunmadan raw body'yi yakalar.
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addHook('preParsing', async (request: any, _reply: any, payload: any) => {
    const chunks: Buffer[] = [];
    for await (const chunk of payload) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);
    request.rawBody = rawBody;
    // Aynı veriyi yeni stream olarak geri döndür (Fastify parse etmeye devam etsin)
    const { Readable } = await import('stream');
    const readable = new Readable();
    readable.push(rawBody);
    readable.push(null);
    return readable;
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
