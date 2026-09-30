'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Thin top bar from the moment an in-app link is clicked until the route settles.
 * Pairs with `(public)/loading.tsx` so clicks never feel frozen.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/') || href.startsWith('//')) return;
      if (anchor.target && anchor.target !== '_self') return;
      const nextPath = href.split('?')[0].split('#')[0];
      if (nextPath === pathname) return;
      setActive(true);
      setWidth(28);
      window.setTimeout(() => setWidth((w) => (w < 70 ? 70 : w)), 120);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    setWidth(100);
    const hide = window.setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 220);
    return () => window.clearTimeout(hide);
  }, [pathname, active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.55)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
