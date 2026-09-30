'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiRequestError } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { portalHomeForRoles, roleAllowsPortalPath } from '@/lib/portal-access';

/** Redirects signed-in users away from portal areas their role cannot use. */
export function PortalAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api<Profile>('/auth/profile')
      .then((profile) => {
        if (cancelled) return;
        const roles = profile.roles.map((r) => r.name);
        if (!roleAllowsPortalPath(pathname, roles)) {
          router.replace(portalHomeForRoles(roles));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 401) {
          router.replace('/login?expired=1');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return children;
}
