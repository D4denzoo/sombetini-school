import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentProvider } from './providers/payment.provider';
import { AuditModule } from '../audit/audit.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [AuditModule, MessagingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProvider],
  exports: [PaymentsService, PaymentProvider],
})
export class PaymentsModule {}
