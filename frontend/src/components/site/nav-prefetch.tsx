'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROUTES = [
  '/',
  '/about',
  '/academics',
  '/school-life',
  '/news',
  '/events',
  '/results',
  '/resources',
  '/contact',
  '/login?portal=parent',
  '/login?portal=teacher',
];

/** Warm the App Router cache for primary destinations so menu clicks feel immediate. */
export function NavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      for (const href of ROUTES) {
        try {
          router.prefetch(href);
        } catch {
          /* prefetch is best-effort */
        }
      }
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      timeoutId = setTimeout(run, 400);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [router]);

  return null;
}
