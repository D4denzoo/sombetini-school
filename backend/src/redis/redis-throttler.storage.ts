import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Rate-limit counters shared by every API replica.
 * The in-memory default counts per process, so two backends would each allow the full limit.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private static readonly script = `
    local hits = redis.call('INCR', KEYS[1])
    local ttl = redis.call('PTTL', KEYS[1])
    if ttl <= 0 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
      ttl = tonumber(ARGV[1])
    end
    local blocked = 0
    local blockTtl = redis.call('PTTL', KEYS[2])
    if blockTtl > 0 then
      blocked = 1
    elseif hits > tonumber(ARGV[2]) then
      redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
      blockTtl = tonumber(ARGV[3])
      blocked = 1
    else
      blockTtl = 0
    end
    return { hits, ttl, blocked, blockTtl }
  `;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitKey}:blocked`;
    const block = blockDuration > 0 ? blockDuration : ttl;

    const [totalHits, ttlMs, blocked, blockMs] = (await this.redis.eval(
      RedisThrottlerStorage.script,
      2,
      hitKey,
      blockKey,
      String(ttl),
      String(limit),
      String(block),
    )) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: Math.max(1, Math.ceil(ttlMs / 1000)),
      isBlocked: blocked === 1,
      timeToBlockExpire: Math.max(0, Math.ceil(blockMs / 1000)),
    };
  }
}
