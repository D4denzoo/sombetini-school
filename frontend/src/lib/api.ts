import { userFacingMessage } from '@/lib/user-error';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Turn a stored upload path into a same-origin URL.
 * Prefer /uploads/… so Next rewrites (dev) and Nginx (Docker) serve the file without CSP issues.
 */
export function publicAssetUrl(fileUrl?: string | null): string {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('/')) return fileUrl;
  try {
    const parsed = new URL(fileUrl);
    if (parsed.pathname.startsWith('/uploads')) return `${parsed.pathname}${parsed.search}`;
  } catch {
    /* keep original */
  }
  return fileUrl;
}

/** Browser talks to this Next app (same-site cookies). Server components call the API directly. */
function apiBase() {
  if (typeof window !== 'undefined') return '';
  return process.env.INTERNAL_API_URL || API_URL;
}

export type ApiError = { message?: string; errors?: string[]; code?: string; requestId?: string };

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const isBrowser = () => typeof window !== 'undefined';

function csrfToken(): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(/(?:^|; )sp_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function stripLegacyTokens() {
  if (!isBrowser()) return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function storeTokens(_tokens?: { accessToken?: string; refreshToken?: string }) {
  stripLegacyTokens();
}

export function clearSession() {
  if (!isBrowser()) return;
  stripLegacyTokens();
  localStorage.removeItem('profile');
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('sombetini-auth');
      channel.postMessage({ type: 'clear' });
      channel.close();
    }
  } catch {
    /* ignore */
  }
}

let refreshing: Promise<boolean> | null = null;
let authChannelBound = false;

function bindAuthChannel() {
  if (!isBrowser() || authChannelBound || typeof BroadcastChannel === 'undefined') return;
  authChannelBound = true;
  const channel = new BroadcastChannel('sombetini-auth');
  channel.onmessage = (event) => {
    const data = event.data as { type?: string };
    if (data?.type === 'clear') {
      stripLegacyTokens();
      localStorage.removeItem('profile');
    }
  };
}

bindAuthChannel();

/**
 * Exchanges the refresh cookie for a new pair. Shared promise so ten parallel 401s make one refresh call.
 */
export function refreshSession(): Promise<boolean> {
  if (!isBrowser()) return Promise.resolve(false);
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = csrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const response = await fetch(`${apiBase()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        clearSession();
        return false;
      }
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('sombetini-auth');
          channel.postMessage({ type: 'refreshed' });
          channel.close();
        }
      } catch {
        /* ignore */
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

function redirectToLogin() {
  if (!isBrowser()) return;
  if (window.location.pathname.startsWith('/portal')) {
    window.location.href = '/login?expired=1';
  }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string | null, retry = true): Promise<T> {
  stripLegacyTokens();
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const csrf = csrfToken();
  if (csrf && !headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', csrf);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBase()}/api/v1${path}`, { ...options, headers, credentials: 'include' }).catch((error: unknown) => {
    if (typeof window !== 'undefined') console.error('API request failed', path, error);
    throw new ApiRequestError(
      userFacingMessage(0),
      0,
    );
  });

  const authPath = path.startsWith('/auth/login') || path.startsWith('/auth/refresh') || path.startsWith('/auth/register');
  if (response.status === 401 && retry && !token && !authPath) {
    const renewed = await refreshSession();
    if (renewed) return api<T>(path, options, undefined, false);
    redirectToLogin();
  }

  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as ApiError & Record<string, unknown>;
  if (!response.ok) {
    const raw = Array.isArray(data.errors) ? data.errors.join(', ') : data.message;
    throw new ApiRequestError(
      userFacingMessage(response.status, raw, data.code),
      response.status,
      data.code,
      data.requestId,
    );
  }
  return data as T;
}

export async function apiBlob(path: string, retry = true): Promise<Blob> {
  stripLegacyTokens();
  const headers = new Headers();
  const csrf = csrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);
  const response = await fetch(`${apiBase()}/api/v1${path}`, { headers, credentials: 'include' });
  if (response.status === 401 && retry) {
    const renewed = await refreshSession();
    if (renewed) return apiBlob(path, false);
    redirectToLogin();
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as ApiError;
    throw new ApiRequestError(
      userFacingMessage(response.status, data.message, data.code),
      response.status,
      data.code,
      data.requestId,
    );
  }
  return response.blob();
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  return api<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string }>('/uploads', { method: 'POST', body: form });
}

export async function publicGet<T>(path: string): Promise<T | null> {
  try {
    // Server-side: prefer the in-network API URL (Docker service name). Browsers never call this helper.
    const base = process.env.INTERNAL_API_URL || API_URL;
    const response = await fetch(`${base}/api/v1${path}`, {
      next: { revalidate: 120, tags: ['public', `public:${path.split('?')[0]}`] },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
