import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

// Registered globally in main.ts via app.useGlobalFilters(). @Catch() with no argument
// means this is the last line of defence for *any* thrown value (HttpException, a plain
// Error from a bug, a driver error, etc.) — not just NestJS's own exceptions — so every
// error response leaving the API has the same shape for consumers to rely on.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveError(exception);

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const internalServerErrorStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    if (statusCode >= internalServerErrorStatus) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }

  private resolveError(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // ValidationPipe throws a BadRequestException whose response body is
      // { statusCode, message: string[], error } — surface that array as-is
      // instead of flattening it, so field-level validation errors aren't lost.
      if (typeof payload === 'object' && payload !== null) {
        const { message, error } = payload as {
          message?: string | string[];
          error?: string;
        };
        return {
          statusCode: status,
          message: message ?? exception.message,
          error: error ?? STATUS_CODES[status] ?? 'Error',
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: STATUS_CODES[status] ?? 'Error',
      };
    }

    // Anything that isn't an HttpException is unexpected — don't leak internal
    // error details (stack traces, driver messages) to the client.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }
}
