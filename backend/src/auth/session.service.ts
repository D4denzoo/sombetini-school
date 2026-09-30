import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ROLE_PERMISSIONS } from '../common/constants/roles';

export interface AccessPayload {
  sub: string;
  email: string;
  sid: string;
  typ: 'access';
}

export interface RefreshPayload {
  sub: string;
  sid: string;
  typ: 'refresh';
}

export const AUTH_CACHE_TTL_SECONDS = 15;

/**
 * Owns sign-in sessions:
 *  - one refresh_tokens row per device, rotated on every refresh
 *  - reuse of an already-rotated token revokes every session of that account
 *  - the identity the guards need (roles, parentId, teacherId) is cached in Redis
 *    so ordinary API calls do not hit Postgres
 */
@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
  ) {}

  static cacheKey(userId: string) {
    return `auth:user:${userId}`;
  }

  async issue(userId: string, email: string, ip?: string, userAgent?: string) {
    const session = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: 'pending',
        ipAddress: ip,
        userAgent: userAgent?.slice(0, 255),
        expiresAt: this.refreshExpiry(),
      },
    });

    return this.signPair(userId, email, session.id);
  }

  /** Validates a refresh token, rotates it, and returns a new pair. */
  async rotate(refreshToken: string, ip?: string, userAgent?: string) {
    let payload: RefreshPayload;
    try {
      payload = this.jwt.verify<RefreshPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Invalid token');

    const session = await this.prisma.refreshToken.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session not found. Please sign in again.');
    }

    if (session.revokedAt) {
      // A rotated token came back: someone replayed an old refresh token. Sign the whole account out.
      await this.revokeAll(session.userId);
      throw new UnauthorizedException('This session was reused and has been closed for safety. Please sign in again.');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    // Never call argon2.verify on the 'pending' placeholder written before the hash is stored.
    if (!session.tokenHash || session.tokenHash === 'pending' || !session.tokenHash.startsWith('$')) {
      throw new UnauthorizedException('Session is not ready. Please sign in again.');
    }

    const matches = await argon2.verify(session.tokenHash, this.fingerprint(refreshToken));
    if (!matches) {
      await this.revokeAll(session.userId);
      throw new UnauthorizedException('Invalid session. Please sign in again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, status: true, deletedAt: true },
    });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      await this.revokeAll(session.userId);
      throw new UnauthorizedException('Account is not active');
    }

    // Claim the row atomically so two tabs refreshing at once cannot both mint sessions
    // (or falsely trigger the reuse ban). Only the winner of updateMany proceeds.
    const replacement = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });
      if (claimed.count !== 1) {
        return null;
      }
      return tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: 'pending',
          ipAddress: ip,
          userAgent: userAgent?.slice(0, 255),
          expiresAt: this.refreshExpiry(),
        },
      });
    });

    if (!replacement) {
      await this.revokeAll(session.userId);
      throw new UnauthorizedException('This session was reused and has been closed for safety. Please sign in again.');
    }

    await this.markSessionClosed(session.id);
    return this.signPair(user.id, user.email, replacement.id);
  }

  async revoke(sessionId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.markSessionClosed(sessionId);
  }

  async revokeAll(userId: string) {
    const open = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await Promise.all(open.map((row) => this.markSessionClosed(row.id)));
    await this.invalidate(userId);
  }

  async listSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Identity for the guards. Cached briefly; cleared whenever roles or status change. */
  async resolveUser(userId: string): Promise<AuthUser | null> {
    const key = SessionService.cacheKey(userId);
    const cached = await this.redis.get<AuthUser & { active: boolean }>(key);
    if (cached) return cached.active ? cached : null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        parent: { select: { id: true } },
        teacher: { select: { id: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      await this.redis.set(key, { active: false }, AUTH_CACHE_TTL_SECONDS);
      return null;
    }

    const roles = user.roles.map((entry) => entry.role.name);
    const permissions = new Set<string>();
    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
      if (rolePerms) rolePerms.forEach((perm) => permissions.add(perm));
    }

    const identity: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: Array.from(permissions),
      parentId: user.parent?.id,
      teacherId: user.teacher?.id,
    };

    await this.redis.set(key, { ...identity, active: true }, AUTH_CACHE_TTL_SECONDS);
    return identity;
  }

  async invalidate(userId: string) {
    await this.redis.del(SessionService.cacheKey(userId));
  }

  async isSessionOpen(sessionId: string): Promise<boolean> {
    const key = `auth:session:${sessionId}`;
    const cached = await this.redis.get<{ open: boolean }>(key);
    if (cached) return cached.open;

    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
      select: { revokedAt: true, expiresAt: true },
    });
    const open = Boolean(session && !session.revokedAt && session.expiresAt > new Date());
    await this.redis.set(key, { open }, open ? AUTH_CACHE_TTL_SECONDS : 5);
    return open;
  }

  async markSessionClosed(sessionId: string) {
    await this.redis.set(`auth:session:${sessionId}`, { open: false }, 5);
  }

  private async signPair(userId: string, email: string, sessionId: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, sid: sessionId, typ: 'access' } satisfies AccessPayload,
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    const refreshToken = this.jwt.sign(
      { sub: userId, sid: sessionId, typ: 'refresh' } satisfies RefreshPayload,
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { tokenHash: await argon2.hash(this.fingerprint(refreshToken)) },
    });
    await this.redis.del(`auth:session:${sessionId}`);

    return { accessToken, refreshToken, tokenType: 'Bearer' as const, sessionId };
  }

  /** Argon2 is tuned for passwords; hashing a fixed-length digest keeps it fast for long JWTs. */
  private fingerprint(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiry() {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const match = /^(\d+)([smhd])$/.exec(raw.trim());
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
    const ms = match ? Number(match[1]) * unit[match[2] as keyof typeof unit] : 7 * unit.d;
    return new Date(Date.now() + ms);
  }
}
