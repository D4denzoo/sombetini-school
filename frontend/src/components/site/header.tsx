'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, GraduationCap, Mail, Menu, Phone, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, SheetContent, DialogTitle } from '@/components/ui/dialog';
import { Logo } from '@/components/site/logo';
import { NavPrefetch } from '@/components/site/nav-prefetch';
import { ThemeToggle } from '@/components/site/theme-toggle';
import { cn } from '@/lib/utils';
import type { SchoolSettings } from '@/lib/types';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/academics', label: 'Academics' },
  { href: '/school-life', label: 'School Life' },
  { href: '/news', label: 'News' },
  { href: '/events', label: 'Events' },
  { href: '/results', label: 'Results' },
  { href: '/resources', label: 'Resources' },
  { href: '/contact', label: 'Contact' },
];

export function Header({ settings }: { settings?: SchoolSettings | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length > 1) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40">
      <NavPrefetch />
      <div className="kente-line h-1.5" />
      <div className="khanga h-1.5" />
      {/* Utility bar */}
      <div className="hidden bg-brand-950 text-white lg:block">
        <div className="container-x flex h-9 items-center justify-between text-xs">
          <div className="flex items-center gap-5 text-white/75">
            <a href={`tel:${settings?.phone || '+255272501234'}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Phone className="h-3.5 w-3.5 text-gold-300" /> {settings?.phone || '+255 27 250 1234'}
            </a>
            <a href={`mailto:${settings?.email || 'info@sombetini.ac.tz'}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="h-3.5 w-3.5 text-gold-300" /> {settings?.email || 'info@sombetini.ac.tz'}
            </a>
            <span className="text-white/50">{settings?.workingHours || 'Mon–Fri · 7:30 – 15:30'}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login?portal=teacher" className="inline-flex items-center gap-1.5 text-white/75 hover:text-white">
              <BookOpen className="h-3.5 w-3.5" /> Teacher Portal
            </Link>
            <Link href="/login?portal=parent" className="inline-flex items-center gap-1.5 text-gold-300 hover:text-gold-200">
              <Users className="h-3.5 w-3.5" /> Parent Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className={cn('glass border-b transition-all duration-300', scrolled ? 'border-border/80 shadow-soft' : 'border-transparent')}>
        <div className="container-x flex h-[72px] items-center justify-between gap-6">
          <Link href="/" aria-label="Sombetini Primary School home" className="shrink-0">
            <Logo logoUrl={settings?.logoUrl} />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
            {links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  className={cn(
                    'relative rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors',
                    active ? 'text-brand-700 dark:text-brand-300' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                  )}
                >
                  {link.label}
                  {active && <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-gold-400" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={search} className="hidden md:block">
              <label className="sr-only" htmlFor="site-search">Search the school site</label>
              <span className="flex h-10 items-center gap-2 rounded-full border border-border bg-background/70 px-3.5 transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-ring/20">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                <input id="site-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tafuta…" className="w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-32" />
              </span>
            </form>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
              <Link href="/login?portal=teacher">Teacher Portal</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/login?portal=parent">
                Parent Portal <ArrowRight />
              </Link>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="xl:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </DialogTrigger>
              <SheetContent className="w-[min(24rem,92vw)] p-0">
                <DialogTitle className="sr-only">Menu</DialogTitle>
                <div className="border-b p-5">
                  <Logo logoUrl={settings?.logoUrl} />
                </div>
                <form onSubmit={search} className="p-5 pb-0">
                  <label className="sr-only" htmlFor="site-search-mobile">Search the school site</label>
                  <span className="flex h-11 items-center gap-2 rounded-xl border border-border px-3.5">
                    <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <input id="site-search-mobile" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the site…" className="w-full bg-transparent text-sm outline-none" />
                  </span>
                </form>
                <nav className="flex-1 overflow-y-auto p-5" aria-label="Mobile">
                  <ul className="space-y-1">
                    {links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} prefetch className={cn('flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-medium hover:bg-secondary', pathname === link.href && 'bg-secondary text-brand-700')}>
                          {link.label}
                          <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="grid gap-2 border-t p-5">
                  <Button asChild size="lg">
                    <Link href="/login?portal=parent"><Users /> Parent Portal</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login?portal=teacher"><GraduationCap /> Teacher Portal</Link>
                  </Button>
                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <span>{settings?.phone || '+255 27 250 1234'}</span>
                    <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
