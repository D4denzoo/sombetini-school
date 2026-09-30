import Link from 'next/link';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { publicGet } from '@/lib/api';
import type { Paged, SchoolEvent } from '@/lib/types';
import { PageHero } from '@/components/site/section-heading';
import { Badge, categoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/skeleton';
import { Reveal } from '@/components/motion';
import { cn, daysUntil, formatDate, humanize } from '@/lib/utils';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Events',
  'School calendar — meetings, sports, examinations, and holidays at Sombetini.',
  { path: '/events' },
);

const categories = ['EXAMINATION', 'PARENT_MEETING', 'SPORTS_DAY', 'GRADUATION', 'COMPETITION', 'HOLIDAY', 'CULTURAL', 'SCHOOL_OPENING', 'SCHOOL_CLOSING'];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ category?: string; past?: string }> }) {
  const { category, past } = await searchParams;
  const from = past ? '' : `&from=${encodeURIComponent(new Date().toISOString())}`;
  const events = await publicGet<Paged<SchoolEvent>>(`/events?limit=60${from}${category ? `&category=${category}` : ''}`);
  const items = (events?.data || []).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const groups = new Map<string, SchoolEvent[]>();
  for (const event of items) {
    const key = new Date(event.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    groups.set(key, [...(groups.get(key) || []), event]);
  }
  const next = items[0];
  const countdown = daysUntil(next?.startDate);

  return (
    <>
      <PageHero eyebrow="Events calendar" title="Term dates, examinations and school events" text="Everything families need to plan around: examinations, parent meetings, sports days, graduation, holidays and opening dates.">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant={past ? 'outline' : 'default'}><Link href={`/events${category ? `?category=${category}` : ''}`}>Upcoming</Link></Button>
          <Button asChild variant={past ? 'default' : 'outline'}><Link href={`/events?past=1${category ? `&category=${category}` : ''}`}>Past events</Link></Button>
          <Button asChild variant="ghost"><Link href="/examinations">Examination calendar only</Link></Button>
        </div>
      </PageHero>

      <section className="container-x py-12">
        {next && !past && (
          <Reveal className="dark-band mb-10 grid gap-6 overflow-hidden rounded-[2rem] p-8 text-white md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-white/10">
              <span className="font-display text-4xl font-extrabold leading-none">{new Date(next.startDate).getDate()}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gold-300">{new Date(next.startDate).toLocaleDateString('en-GB', { month: 'short' })}</span>
            </div>
            <div>
              <p className="eyebrow text-gold-300">Next up</p>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{next.title}</h2>
              <p className="mt-1 text-sm text-white/70">{humanize(next.category)}{next.location ? ` · ${next.location}` : ''}{next.description ? ` — ${next.description}` : ''}</p>
            </div>
            {countdown !== null && (
              <div className="rounded-2xl bg-gold-400 px-6 py-4 text-center text-brand-950">
                <p className="font-display text-3xl font-extrabold">{countdown <= 0 ? 'Today' : countdown}</p>
                <p className="text-xs font-semibold uppercase tracking-wider">{countdown <= 0 ? '' : countdown === 1 ? 'day away' : 'days away'}</p>
              </div>
            )}
          </Reveal>
        )}

        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Link href={`/events${past ? '?past=1' : ''}`} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition', !category ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:bg-secondary')}>All</Link>
          {categories.map((item) => (
            <Link key={item} href={`/events?category=${item}${past ? '&past=1' : ''}`} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition', category === item ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:bg-secondary')}>{humanize(item)}</Link>
          ))}
        </div>

        {items.length ? (
          <div className="mt-10 space-y-12">
            {Array.from(groups.entries()).map(([month, list]) => (
              <Reveal key={month}>
                <h2 className="sticky top-[76px] z-10 -mx-4 bg-background/90 px-4 py-2 font-display text-xl font-bold backdrop-blur lg:static lg:bg-transparent lg:p-0">{month}</h2>
                <ul className="mt-4 grid gap-4 md:grid-cols-2">
                  {list.map((event) => {
                    const start = new Date(event.startDate);
                    return (
                      <li key={event.id} className="surface surface-hover flex gap-5 p-5">
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary text-brand-800 dark:text-brand-200">
                          <span className="font-display text-2xl font-extrabold leading-none">{start.getDate()}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider">{start.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Badge variant={categoryBadge(event.category)}>{humanize(event.category)}</Badge>
                          <h3 className="mt-2 font-display text-lg font-bold leading-snug">{event.title}</h3>
                          {event.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>}
                          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {event.isAllDay ? 'All day' : start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}{event.endDate ? ` → ${formatDate(event.endDate, { day: 'numeric', month: 'short' })}` : ''}</span>
                            {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-10"><EmptyState icon={CalendarDays} title={past ? 'No past events recorded' : 'No upcoming events published'} text="Check back soon for term dates, meetings, and school celebrations." /></div>
        )}
      </section>
    </>
  );
}
