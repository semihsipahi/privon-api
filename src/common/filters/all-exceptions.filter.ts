import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const logMessage = {
      statusCode: status,
      path: request.url,
      method: request.method,
      remoteAddress: request.ip,
      message: exception instanceof Error ? exception.message : message,
      stack: exception instanceof Error ? exception.stack : null,
      body: request.body,
      query: request.query,
      params: request.params,
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : undefined,
        AllExceptionsFilter.name,
      );
      this.logger.error(`Request Detail: ${JSON.stringify(logMessage)}`);
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(message)}`,
      );
      this.logger.warn(`Request Detail: ${JSON.stringify(logMessage)}`);
    }

    response.code(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
    });
  }
}
