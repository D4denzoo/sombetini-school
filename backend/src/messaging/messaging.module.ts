import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { MessagingService } from './messaging.service';
import { MessagingProcessor } from './messaging.processor';

@Module({
  providers: [EmailService, SmsService, MessagingService, MessagingProcessor],
  exports: [EmailService, SmsService, MessagingService],
})
export class MessagingModule {}
