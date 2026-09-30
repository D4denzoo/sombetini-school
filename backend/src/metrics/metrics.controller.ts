import { Controller, Get, Header, Headers, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Public } from '../common/decorators/auth.decorators';
import { MetricsService } from './metrics.service';
import { MessagingService } from '../messaging/messaging.service';

/**
 * Prometheus scrape target. Disabled unless METRICS_TOKEN is set; the scraper sends it as
 * `Authorization: Bearer <token>` or `x-metrics-token`.
 */
@ApiTags('admin')
@Controller('metrics')
export class MetricsController {
  constructor(
    private metrics: MetricsService,
    private config: ConfigService,
    private messaging: MessagingService,
  ) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics (requires METRICS_TOKEN)' })
  async scrape(@Headers('authorization') authorization?: string, @Headers('x-metrics-token') tokenHeader?: string) {
    const expected = this.config.get<string>('METRICS_TOKEN')?.trim();
    if (!expected) throw new NotFoundException();

    const provided = (tokenHeader || authorization?.replace(/^Bearer\s+/i, '') || '').trim();
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'))
    ) {
      throw new UnauthorizedException();
    }

    const queue = await this.messaging.queueHealth().catch(() => null);
    if (queue) {
      this.metrics.setGauge('sombetini_messaging_queue_waiting', queue.waiting);
      this.metrics.setGauge('sombetini_messaging_queue_active', queue.active);
      this.metrics.setGauge('sombetini_messaging_queue_failed', queue.failed);
      this.metrics.setGauge('sombetini_messaging_queue_delayed', queue.delayed);
    }

    return this.metrics.render();
  }
}
