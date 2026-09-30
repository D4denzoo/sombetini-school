import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from '../../metrics/metrics.service';

/** One log line per request with duration, status, user, and request id; feeds the metrics histogram. */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');

  constructor(private metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const started = process.hrtime.bigint();
    const req = context.switchToHttp().getRequest<Request & { requestId?: string; user?: { id?: string } }>();
    const res = context.switchToHttp().getResponse<Response>();
    const route = this.routeLabel(req);

    const finish = (status: number, error?: unknown) => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      this.metrics.observe(req.method, route, status, durationMs);
      if (route.startsWith('/api/v1/health') || route === '/api/v1/metrics') return;

      const entry = {
        message: `${req.method} ${req.originalUrl} ${status} ${durationMs.toFixed(1)}ms`,
        method: req.method,
        route,
        status,
        durationMs: Math.round(durationMs * 10) / 10,
        requestId: req.requestId,
        userId: req.user?.id,
        ip: req.ip,
      };
      if (status >= 500) this.logger.error({ ...entry, error: error instanceof Error ? error.message : undefined });
      else if (status >= 400) this.logger.warn(entry);
      else this.logger.log(entry);
    };

    return next.handle().pipe(
      tap({
        next: () => finish(res.statusCode),
        error: (error) => {
          const status = typeof error?.getStatus === 'function' ? error.getStatus() : 500;
          finish(status, error);
        },
      }),
    );
  }

  /** Replace ids with placeholders so metrics stay bounded (route label = Express path pattern). */
  private routeLabel(req: Request): string {
    const pattern = (req.route as { path?: string } | undefined)?.path;
    if (pattern) return `${req.baseUrl || ''}${pattern}`;
    return (req.originalUrl || req.url)
      .split('?')[0]
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+(?=\/|$)/g, '/:n');
  }
}
