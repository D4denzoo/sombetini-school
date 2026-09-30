import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { parseRedisUrl } from '../redis/redis.module';
import { DOCUMENTS_QUEUE, MAINTENANCE_QUEUE, MESSAGING_QUEUE } from './queue.constants';

const queueModules = [MESSAGING_QUEUE, MAINTENANCE_QUEUE, DOCUMENTS_QUEUE].map((name) =>
  BullModule.registerQueue({ name }),
);

/**
 * Background work lives here so the request path stays fast:
 * outbound email/SMS, bulk notices, report card PDFs, and nightly housekeeping.
 * Redis holds the jobs, so a restart does not lose pending work.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = parseRedisUrl(config.get<string>('REDIS_URL', 'redis://localhost:6379'));
        return {
          redis: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
            username: redis.username,
            db: redis.db,
            tls: redis.tls,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          prefix: 'sombetini',
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        };
      },
    }),
    ...queueModules,
  ],
  exports: [...queueModules],
})
export class QueueModule {}
