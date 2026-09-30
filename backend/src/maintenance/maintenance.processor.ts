import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MAINTENANCE_QUEUE, MaintenanceJob } from '../queue/queue.constants';

/**
 * Nightly housekeeping so the busiest tables do not grow without limit.
 * Every window is configurable; defaults keep audit history for two years.
 */
@Processor(MAINTENANCE_QUEUE)
export class MaintenanceProcessor {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private days(name: string, fallback: number) {
    const value = Number(this.config.get<string>(name));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private before(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  @Process(MaintenanceJob.RETENTION)
  async retention() {
    const readNotices = await this.prisma.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: this.before(this.days('NOTIFICATION_RETENTION_DAYS', 90)) } },
    });
    const staleNotices = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: this.before(this.days('NOTIFICATION_MAX_AGE_DAYS', 365)) } },
    });
    const otp = await this.prisma.otpToken.deleteMany({
      where: { OR: [{ used: true }, { expiresAt: { lt: new Date() } }], createdAt: { lt: this.before(7) } },
    });
    const sessions = await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: this.before(1) } }, { revokedAt: { lt: this.before(30) } }] },
    });
    const audit = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: this.before(this.days('AUDIT_RETENTION_DAYS', 730)) } },
    });
    const aiCutoff = this.before(this.days('AI_CHAT_RETENTION_DAYS', 180));
    const aiMessages = await this.prisma.aiMessage.deleteMany({ where: { createdAt: { lt: aiCutoff } } });
    const aiConversations = await this.prisma.aiConversation.deleteMany({
      where: { updatedAt: { lt: aiCutoff }, messages: { none: {} } },
    });
    const webhooks = await this.prisma.paymentWebhookEvent.deleteMany({
      where: { receivedAt: { lt: this.before(this.days('WEBHOOK_RETENTION_DAYS', 365)) } },
    });

    const summary = {
      readNotices: readNotices.count,
      staleNotices: staleNotices.count,
      otpTokens: otp.count,
      sessions: sessions.count,
      auditLogs: audit.count,
      aiMessages: aiMessages.count,
      aiConversations: aiConversations.count,
      webhookEvents: webhooks.count,
    };
    this.logger.log(`retention ${JSON.stringify(summary)}`);
    return summary;
  }

  @Process(MaintenanceJob.EXPIRE_PAYMENTS)
  async expirePayments() {
    const result = await this.prisma.payment.updateMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.CONTROL_NUMBER_GENERATED, PaymentStatus.PAYMENT_INITIATED] },
        deadline: { lt: new Date() },
      },
      data: { status: PaymentStatus.EXPIRED },
    });
    if (result.count > 0) this.logger.log(`expired control numbers=${result.count}`);
    return { expired: result.count };
  }
}
