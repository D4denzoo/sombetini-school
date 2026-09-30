'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'sp_cookie_notice_v1';

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-notice-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur-sm sm:p-5"
    >
      <div className="container-x flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl text-sm leading-6 text-muted-foreground">
          <p id="cookie-notice-title" className="font-semibold text-foreground">
            Cookies on this site
          </p>
          <p className="mt-1">
            We use essential cookies to keep you signed in and to protect forms. We do not use advertising cookies.{' '}
            <Link href="/privacy" className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
              Privacy policy
            </Link>
            {' · '}
            <Link href="/terms" className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
              Terms of use
            </Link>
          </p>
        </div>
        <Button type="button" size="sm" className="shrink-0" onClick={dismiss}>
          Understood
        </Button>
      </div>
    </div>
  );
}
