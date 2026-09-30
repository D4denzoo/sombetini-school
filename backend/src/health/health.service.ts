import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MessagingService } from '../messaging/messaging.service';
import { PaymentProvider } from '../payments/providers/payment.provider';

type Check = { status: string; latencyMs?: number; configured?: boolean; provider?: string; detail?: Record<string, number> };

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private messaging: MessagingService,
    private payments: PaymentProvider,
  ) {}

  async live() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.redis.getClient().ping();
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'degraded', timestamp: new Date().toISOString() };
    }
  }

  async check() {
    const checks: Record<string, Check> = {};

    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', latencyMs: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'down' };
    }

    const redisStart = Date.now();
    try {
      await this.redis.getClient().ping();
      checks.redis = { status: 'up', latencyMs: Date.now() - redisStart };
    } catch {
      checks.redis = { status: 'down' };
    }

    try {
      const queue = await this.messaging.queueHealth();
      checks.queue = { status: queue.failed > 50 ? 'degraded' : 'up', detail: queue };
    } catch {
      checks.queue = { status: 'down' };
    }

    const mail = this.messaging.status().email;
    checks.email = { status: mail.configured ? 'configured' : 'not_configured', configured: mail.configured };

    const sms = this.messaging.status().sms;
    checks.sms = { status: sms.configured ? 'configured' : 'not_configured', configured: sms.configured, provider: sms.provider };

    const gateway = this.payments.status();
    checks.payments = { status: gateway.live ? 'live' : 'office-reconciled', configured: gateway.live, provider: gateway.provider };

    const criticalUp = checks.database.status === 'up' && checks.redis.status === 'up';

    return {
      status: criticalUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'sombetini-school-api',
      version: '1.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      checks,
      messaging: this.messaging.status(),
    };
  }
}
