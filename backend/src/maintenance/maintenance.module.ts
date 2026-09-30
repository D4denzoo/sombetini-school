import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { JobOptions, Queue } from 'bull';
import { MaintenanceProcessor } from './maintenance.processor';
import { MAINTENANCE_QUEUE, MaintenanceJob } from '../queue/queue.constants';

const SCHEDULES: { name: (typeof MaintenanceJob)[keyof typeof MaintenanceJob]; jobId: string; cron: string }[] = [
  { name: MaintenanceJob.RETENTION, jobId: 'retention-nightly', cron: '0 2 * * *' },
  { name: MaintenanceJob.EXPIRE_PAYMENTS, jobId: 'expire-payments-hourly', cron: '15 * * * *' },
];

@Module({
  providers: [MaintenanceProcessor],
})
export class MaintenanceModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaintenanceModule.name);

  constructor(@InjectQueue(MAINTENANCE_QUEUE) private queue: Queue) {}

  /**
   * Ensures each schedule exists once. Does not wipe other replicas' jobs on boot —
   * only removes a repeatable entry when its cron no longer matches what we want.
   */
  async onApplicationBootstrap() {
    try {
      const existing = await this.queue.getRepeatableJobs();
      for (const schedule of SCHEDULES) {
        const match = existing.find((job) => job.id === schedule.jobId || job.name === schedule.name);
        if (match && match.cron === schedule.cron) {
          continue;
        }
        if (match) {
          await this.queue.removeRepeatableByKey(match.key);
        }
        const options: JobOptions = {
          jobId: schedule.jobId,
          repeat: { cron: schedule.cron },
          attempts: 3,
        };
        await this.queue.add(schedule.name, {}, options);
      }
      this.logger.log('maintenance schedules registered (retention 02:00 daily, payment expiry hourly)');
    } catch (error) {
      this.logger.warn(`maintenance schedules not registered: ${error instanceof Error ? error.message : error}`);
    }
  }
}
