import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { DeliveryResult } from './messaging.types';
import {
  EmailJobData,
  MESSAGING_QUEUE,
  MessagingJob,
  NotifyUserJobData,
  SmsJobData,
} from '../queue/queue.constants';

type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private sms: SmsService,
    @InjectQueue(MESSAGING_QUEUE) private queue: Queue,
  ) {}

  status() {
    return {
      email: this.email.status(),
      sms: this.sms.status(),
    };
  }

  /** Queues an email. Throws immediately if SMTP is not connected, so callers can tell the user. */
  async sendEmail(to: string, subject: string, text: string, html?: string) {
    if (!this.email.isConfigured()) {
      // Surface the same message the direct sender would produce.
      return this.email.send({ to, subject, text, html });
    }
    const job = await this.queue.add(MessagingJob.EMAIL, { to, subject, text, html } satisfies EmailJobData);
    return { channel: 'email' as const, sent: true, provider: 'smtp', detail: `queued:${job.id}` };
  }

  /** Queues an SMS. Throws immediately if no SMS provider is connected. */
  async sendSms(to: string, message: string) {
    if (!this.sms.isConfigured()) {
      return this.sms.send({ to, message });
    }
    const job = await this.queue.add(MessagingJob.SMS, { to, message } satisfies SmsJobData);
    return { channel: 'sms' as const, sent: true, provider: this.sms.providerName(), detail: `queued:${job.id}` };
  }

  /**
   * Writes the in-app notice now and queues the email/SMS copies.
   * The caller gets an answer in milliseconds regardless of how many recipients there are.
   */
  async notifyUser(input: NotifyInput) {
    const created = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data || {}) as object,
      },
      select: { id: true },
    });

    if (this.email.isConfigured() || this.sms.isConfigured()) {
      await this.queue.add(
        MessagingJob.NOTIFY_USER,
        {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          data: input.data,
        } satisfies NotifyUserJobData,
        { attempts: 3 },
      );
    }

    return { inApp: true, notificationId: created.id, queued: this.email.isConfigured() || this.sms.isConfigured() };
  }

  async notifyUsers(userIds: string[], notification: Omit<NotifyInput, 'userId'>) {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    if (unique.length === 0) return { recipients: 0, queued: false };

    await this.prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: (notification.data || {}) as object,
      })),
    });

    const deliver = this.email.isConfigured() || this.sms.isConfigured();
    if (deliver) {
      await this.queue.addBulk(
        unique.map((userId) => ({
          name: MessagingJob.NOTIFY_USER,
          data: {
            userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
          } satisfies NotifyUserJobData,
          opts: { attempts: 3 },
        })),
      );
    }

    return { recipients: unique.length, queued: deliver };
  }

  /** Runs inside the queue worker: looks up the user's channels and sends email/SMS. */
  async deliverNotification(input: NotifyInput): Promise<DeliveryResult[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, phone: true, deletedAt: true, notificationPrefs: true },
    });
    if (!user || user.deletedAt) return [];

    const channels = this.resolveChannels(user.notificationPrefs, input.type);
    const deliveries: DeliveryResult[] = [];

    if (channels.includes(NotificationChannel.EMAIL) && this.email.isConfigured()) {
      deliveries.push(await this.email.send({ to: user.email, subject: input.title, text: input.message }));
    }

    if (channels.includes(NotificationChannel.SMS) && user.phone && this.sms.isConfigured()) {
      deliveries.push(await this.sms.send({ to: user.phone, message: `${input.title}: ${input.message}`.slice(0, 320) }));
    }

    return deliveries;
  }

  async queueHealth() {
    const [waiting, active, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    return { waiting, active, failed, delayed };
  }

  private resolveChannels(
    prefs: { type: NotificationType; channel: NotificationChannel; enabled: boolean }[],
    type: NotificationType,
  ): NotificationChannel[] {
    const matching = prefs.filter((pref) => pref.type === type && pref.enabled);
    if (matching.length === 0) {
      return [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
    }
    return matching.map((pref) => pref.channel);
  }
}
