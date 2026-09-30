import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  getClient(): Redis {
    return this.redis;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(...keys: string[]): Promise<void> {
    const list = keys.filter(Boolean);
    if (list.length > 0) {
      await this.redis.unlink(...list);
    }
  }

  /**
   * Removes every key matching the pattern without blocking Redis.
   * SCAN walks the keyspace in pages; UNLINK frees memory in the background.
   */
  async delPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let removed = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = next;
      if (keys.length > 0) {
        removed += await this.redis.unlink(...keys);
      }
    } while (cursor !== '0');
    return removed;
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }
}
