import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ReportCardService } from './report-card.service';
import { DOCUMENTS_QUEUE, DocumentsJob, ReportCardPdfJobData } from '../queue/queue.constants';

/** Renders report cards off the request path so results day does not spike API CPU. */
@Processor(DOCUMENTS_QUEUE)
export class ReportCardProcessor {
  private readonly logger = new Logger(ReportCardProcessor.name);

  constructor(private reportCards: ReportCardService) {}

  @Process({ name: DocumentsJob.REPORT_CARD_PDF, concurrency: 2 })
  async render(job: Job<ReportCardPdfJobData>) {
    const result = await this.reportCards.renderAndStore(job.data.reportCardId);
    this.logger.log(`report card stored id=${result.reportCardId} bytes=${result.bytes}`);
    return result;
  }
}
