import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ReportCardService } from './report-card.service';
import { ReportCardProcessor } from './report-card.processor';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [ResultsController],
  providers: [ResultsService, ReportCardService, ReportCardProcessor],
  exports: [ResultsService, ReportCardService],
})
export class ResultsModule {}
