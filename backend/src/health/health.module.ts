import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { MessagingModule } from '../messaging/messaging.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [MessagingModule, PaymentsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
