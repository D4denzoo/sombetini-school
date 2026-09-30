import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

export const ACCESS_COOKIE = 'sp_at';
export const REFRESH_COOKIE = 'sp_rt';
export const CSRF_COOKIE = 'sp_csrf';

export function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const cut = part.indexOf('=');
    if (cut < 1) continue;
    const key = part.slice(0, cut).trim();
    try {
      out[key] = decodeURIComponent(part.slice(cut + 1).trim());
    } catch {
      out[key] = part.slice(cut + 1).trim();
    }
  }
  return out;
}

export function cookieFromRequest(req: Request, name: string): string | undefined {
  return parseCookies(req.headers.cookie)[name];
}

function durationMs(raw: string, fallbackMs: number) {
  const match = /^(\d+)([smhd])$/.exec(raw.trim());
  if (!match) return fallbackMs;
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return Number(match[1]) * unit[match[2] as keyof typeof unit];
}

function cookieSecure(config: ConfigService) {
  const explicit = config.get<string>('COOKIE_SECURE');
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  // Only mark cookies Secure when the public site is HTTPS. NODE_ENV=production alone
  // would break first HTTP/nginx rollouts (browsers refuse Secure cookies over http://).
  const publicOrigin =
    config.get<string>('FRONTEND_URL') ||
    config.get<string>('PUBLIC_API_URL') ||
    '';
  return publicOrigin.trim().toLowerCase().startsWith('https://');
}

function cookieBase(config: ConfigService) {
  return {
    secure: cookieSecure(config),
    sameSite: 'lax' as const,
    path: '/',
    httpOnly: true,
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  config: ConfigService,
) {
  const base = cookieBase(config);
  const accessMs = durationMs(config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'), 15 * 60_000);
  const refreshMs = durationMs(config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'), 7 * 86_400_000);

  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: accessMs });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: refreshMs });
  rotateCsrfCookie(res, config);
}

export function rotateCsrfCookie(res: Response, config: ConfigService) {
  const base = cookieBase(config);
  const token = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    ...base,
    httpOnly: false,
    maxAge: durationMs(config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'), 7 * 86_400_000),
  });
  return token;
}

export function clearAuthCookies(res: Response, config: ConfigService) {
  const base = cookieBase(config);
  res.clearCookie(ACCESS_COOKIE, { ...base });
  res.clearCookie(REFRESH_COOKIE, { ...base });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}
