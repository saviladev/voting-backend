import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const message =
      typeof rawResponse === 'string'
        ? rawResponse
        : (rawResponse as { message?: string | string[] }).message ??
          'Internal server error';

    const error =
      typeof rawResponse === 'object' && rawResponse !== null
        ? (rawResponse as { error?: string }).error
        : undefined;

    if (exception instanceof Error) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        JSON.stringify(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
