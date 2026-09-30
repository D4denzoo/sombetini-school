'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, BookOpen, CreditCard, GraduationCap, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { api, ApiRequestError, clearSession } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function useProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Profile>('/auth/profile')
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiRequestError && err.status === 401) {
          router.replace('/login?expired=1');
          return;
        }
        setError(err.message);
      });
  }, [router]);

  async function reloadProfile() {
    const next = await api<Profile>('/auth/profile');
    setProfile(next);
    return next;
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // The local session is cleared even if the server is unreachable.
    }
    clearSession();
    router.replace('/');
  }

  return { profile, error, logout, reloadProfile };
}

const iconFor: Record<string, typeof LayoutDashboard> = {
  Overview: LayoutDashboard,
  Dashboard: LayoutDashboard,
  Results: GraduationCap,
  Payments: CreditCard,
  Students: Users,
  Announcements: Bell,
  'Enter marks': BookOpen,
  'Teaching resources': BookOpen,
  'System health': LayoutDashboard,
};

export function PortalFrame({
  title,
  kicker,
  links,
  toolbar,
  children,
}: {
  title: string;
  kicker?: string;
  links: { href: string; label: string }[];
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, logout } = useProfile();
  const name = profile ? `${profile.firstName} ${profile.lastName}` : 'Signing in…';

  return (
    <div className="portal-canvas min-h-screen lg:grid lg:grid-cols-[17.5rem_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-950 text-white lg:flex lg:flex-col">
        <div className="khanga h-1.5" />
        <div className="p-6">
          <Link href="/"><Logo light /></Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">{kicker || 'School portal'}</p>
        </div>
        <nav className="flex-1 space-y-1 px-4" aria-label="Portal">
          {links.map((link) => {
            const Icon = iconFor[link.label] || LayoutDashboard;
            const target = link.href.split('#')[0];
            const active = pathname === target;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 text-gold-300" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-400 font-display text-sm font-semibold text-brand-950">
              {initials(name) || '—'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-white/55">{profile?.email}</p>
            </div>
          </div>
          <button type="button" onClick={logout} className="mt-4 inline-flex items-center gap-2 text-sm text-gold-300 hover:text-gold-200">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await api('/auth/logout-all', { method: 'POST' });
              } catch {
                /* clear local session anyway */
              }
              clearSession();
              window.location.href = '/login?expired=1';
            }}
            className="mt-2 block text-left text-xs text-white/55 hover:text-white/80"
          >
            Sign out on every device
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="lg:hidden"><Link href="/"><Logo compact /></Link></div>
            <div className="min-w-0">
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 lg:block">{kicker || 'Portal'}</p>
              <h1 className="truncate font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              {toolbar}
              <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={logout}>Sign out</Button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden" aria-label="Portal shortcuts">
        <ul className="grid grid-cols-4">
          {links.slice(0, 4).map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-semibold text-muted-foreground">
                {(() => { const Icon = iconFor[link.label] || LayoutDashboard; return <Icon className="h-5 w-5 text-brand-700" />; })()}
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
