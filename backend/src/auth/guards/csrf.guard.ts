import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/auth.decorators';
import { CSRF_COOKIE, cookieFromRequest } from '../auth-cookies';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const method = (req.method || 'GET').toUpperCase();
    if (SAFE.has(method)) return true;

    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (path.includes('/payments/webhook')) return true;

    this.assertTrustedOrigin(req);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const bearer = (req.headers.authorization || '').startsWith('Bearer ');
    if (bearer) return true;

    const cookie = cookieFromRequest(req, CSRF_COOKIE);
    const header = String(req.headers['x-csrf-token'] || '').trim();
    if (!cookie || !header || cookie !== header) {
      throw new ForbiddenException('This request failed the CSRF check. Refresh the page and try again.');
    }
    return true;
  }

  private assertTrustedOrigin(req: Request) {
    const allowed = (this.config.get<string>('CORS_ORIGINS', 'http://localhost:3000'))
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const origin = String(req.headers.origin || '').trim();
    if (origin) {
      if (!allowed.includes(origin)) {
        throw new ForbiddenException('Request origin is not allowed');
      }
      return;
    }

    const referer = String(req.headers.referer || '').trim();
    if (!referer) return;
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowed.includes(refererOrigin)) {
        throw new ForbiddenException('Request origin is not allowed');
      }
    } catch {
      throw new ForbiddenException('Request origin is not allowed');
    }
  }
}
