import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { looksTechnical } from './safe-message';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = this.fallback(status);
    let errors: string[] | undefined;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = this.publicText(status, exceptionResponse);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (typeof resp.code === 'string') code = resp.code;
        if (Array.isArray(resp.message)) {
          const safe = resp.message.map(String).filter((item) => !looksTechnical(item));
          errors = safe.length ? safe : undefined;
          message = errors ? 'Check the details you entered and try again.' : this.fallback(status);
        } else {
          message = this.publicText(status, typeof resp.message === 'string' ? resp.message : '');
        }
      }
      if (status >= 500) {
        this.logger.error({
          message: 'http exception',
          status,
          requestId: request?.requestId,
          path: request?.originalUrl,
          method: request?.method,
          error: exception.message,
          stack: exception.stack,
        });
        message = this.fallback(status);
        errors = undefined;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error({
        message: `prisma ${exception.code}`,
        detail: exception.message,
        requestId: request?.requestId,
        path: request?.originalUrl,
      });
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'This is already on the system. Sign in if you already have an account, or use different details.';
        code = 'DUPLICATE';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'We could not find that. Check the details, or contact the school office.';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Check the details you entered and try again.';
      } else if (exception.code === 'P2024') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'The school site is briefly busy. Wait a moment and try again.';
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = this.fallback(500);
      }
    } else {
      this.logger.error({
        message: 'unhandled exception',
        requestId: request?.requestId,
        path: request?.originalUrl,
        method: request?.method,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
      message = this.fallback(status);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      code,
      errors,
      requestId: request?.requestId,
    });
  }

  private publicText(status: number, raw: string): string {
    const text = raw.split('\n')[0]?.trim() || '';
    if (!text || looksTechnical(text) || status >= 500) return this.fallback(status);
    return text;
  }

  private fallback(status: number): string {
    if (status === 401) return 'Your session ended. Sign in again to continue.';
    if (status === 403) return 'You do not have permission for this. If you think that is a mistake, contact the school office.';
    if (status === 404) return 'We could not find that. Check the details, or contact the school office.';
    if (status === 409) return 'This is already on the system. Sign in, or change the details and try again.';
    if (status === 429) return 'Too many attempts. Wait a minute, then try again.';
    if (status === 400 || status === 422) return 'Check the details you entered and try again.';
    if (status === 503) return 'The school site is briefly unavailable. Wait a moment and try again.';
    return 'Something went wrong on our side. Wait a moment and try again. If it continues, contact the school office during working hours.';
  }
}
