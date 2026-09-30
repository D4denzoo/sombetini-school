import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AccessPayload, SessionService } from '../session.service';
import { ACCESS_COOKIE, cookieFromRequest } from '../auth-cookies';

export type RequestUser = AuthUser & { sessionId: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private sessions: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => (request ? cookieFromRequest(request, ACCESS_COOKIE) : undefined) || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessPayload): Promise<RequestUser> {
    if (payload.typ !== 'access' || !payload.sid) {
      throw new UnauthorizedException('Invalid token');
    }

    const [user, open] = await Promise.all([
      this.sessions.resolveUser(payload.sub),
      this.sessions.isSessionOpen(payload.sid),
    ]);

    if (!user) {
      throw new UnauthorizedException('Akaunti haipo au imezimwa');
    }
    if (!open) {
      throw new UnauthorizedException('Session closed. Please sign in again.');
    }

    return { ...user, sessionId: payload.sid };
  }
}
