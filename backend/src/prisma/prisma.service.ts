import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Adds a connection cap to DATABASE_URL when none is set so N API replicas cannot exhaust Postgres.
 * DB_POOL_SIZE per process × replicas must stay under Postgres max_connections (200 in docker/postgres/init.sql).
 */
function withPoolLimits(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', process.env.DB_POOL_SIZE || '10');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '20');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '10');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasourceUrl: withPoolLimits(process.env.DATABASE_URL),
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    const attempts = Number(process.env.DB_CONNECT_RETRIES || 10);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        if (attempt === attempts) throw error;
        const wait = Math.min(1000 * 2 ** (attempt - 1), 15000);
        this.logger.warn(`database not reachable (attempt ${attempt}/${attempts}); retrying in ${wait}ms`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;
    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      }
    }
  }
}
