import { Global, Module, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import { REDIS_CLIENT } from './redis.constants';

export function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port || 6379),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    db: parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : 0,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return new Redis(url, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableReadyCheck: true,
        });
      },
    },
    RedisService,
    RedisThrottlerStorage,
  ],
  exports: [REDIS_CLIENT, RedisService, RedisThrottlerStorage],
})
export class RedisModule implements OnModuleInit {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit() {
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      await this.redis.connect();
    }
    this.logger.log('redis connected');
  }
}
