import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationType } from '@prisma/client';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { MessagingService } from './messaging.service';
import {
  EmailJobData,
  MESSAGING_QUEUE,
  MessagingJob,
  NotifyUserJobData,
  SmsJobData,
} from '../queue/queue.constants';

/**
 * Sends what the API only queued. Bull retries failed jobs with backoff,
 * so a slow SMTP relay or SMS gateway never blocks a parent's request.
 */
@Processor(MESSAGING_QUEUE)
export class MessagingProcessor {
  private readonly logger = new Logger(MessagingProcessor.name);

  constructor(
    private email: EmailService,
    private sms: SmsService,
    private messaging: MessagingService,
  ) {}

  @Process({ name: MessagingJob.EMAIL, concurrency: 5 })
  async sendEmail(job: Job<EmailJobData>) {
    const result = await this.email.send(job.data);
    this.logger.log(`email sent to=${job.data.to} id=${result.detail || '-'} job=${job.id}`);
    return result;
  }

  @Process({ name: MessagingJob.SMS, concurrency: 5 })
  async sendSms(job: Job<SmsJobData>) {
    const result = await this.sms.send(job.data);
    this.logger.log(`sms sent to=${job.data.to} provider=${result.provider} job=${job.id}`);
    return result;
  }

  @Process({ name: MessagingJob.NOTIFY_USER, concurrency: 10 })
  async notifyUser(job: Job<NotifyUserJobData>) {
    return this.messaging.deliverNotification({
      userId: job.data.userId,
      type: job.data.type as NotificationType,
      title: job.data.title,
      message: job.data.message,
      data: job.data.data,
    });
  }
}
