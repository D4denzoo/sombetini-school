import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Clock, MapPin } from 'lucide-react';
import { SectionHeading } from '@/components/site/section-heading';
import { Badge, categoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/skeleton';
import { SmartImage } from '@/components/site/smart-image';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { featuredPhotos } from '@/lib/featured-photos';
import { formatDate, humanize } from '@/lib/utils';
import type { Announcement, SchoolEvent } from '@/lib/types';

export function NewsCard({ item, index = 0, featured = false }: { item: Announcement; index?: number; featured?: boolean }) {
  const photo = featuredPhotos[(index + 2) % featuredPhotos.length];
  return (
    <Link href={`/news/${item.slug}`} className="group surface surface-hover flex h-full flex-col overflow-hidden">
      <SmartImage src={item.featuredImage || photo.src} alt="" motif={photo.motif} tone={photo.tone} className={featured ? 'aspect-[16/9]' : 'aspect-[16/10]'} imgClassName="transition-transform duration-500 group-hover:scale-105" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={categoryBadge(item.category)}>{humanize(item.category)}</Badge>
          {item.publishedAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(item.publishedAt, { day: 'numeric', month: 'short' })}</span>}
        </div>
        <h3 className={featured ? 'mt-3 font-display text-2xl font-bold leading-tight' : 'mt-3 font-display text-lg font-bold leading-snug'}>{item.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300">Read more <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
      </div>
    </Link>
  );
}

export function EventRow({ event }: { event: SchoolEvent }) {
  const date = new Date(event.startDate);
  return (
    <li className="group flex gap-4 rounded-2xl border border-transparent p-3 transition hover:border-border hover:bg-card">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
        <span className="font-display text-2xl font-extrabold leading-none">{date.getDate()}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-300">{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <Badge variant={categoryBadge(event.category)}>{humanize(event.category)}</Badge>
        <p className="mt-1.5 truncate font-display text-base font-bold">{event.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {event.isAllDay ? 'All day' : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}{event.endDate && event.endDate !== event.startDate ? ` – ${formatDate(event.endDate, { day: 'numeric', month: 'short' })}` : ''}</span>
          {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>}
        </p>
      </div>
    </li>
  );
}

export function NewsEvents({ news, events }: { news: Announcement[]; events: SchoolEvent[] }) {
  const [lead, ...rest] = news;
  return (
    <section className="container-x py-20">
      <div className="grid gap-12 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <SectionHeading eyebrow="News & notices" title="What’s happening at school" action={{ href: '/news', label: 'All announcements' }} />
          {news.length ? (
            <Stagger className="mt-8 grid gap-5 md:grid-cols-2">
              {lead && <StaggerItem className="md:col-span-2"><NewsCard item={lead} featured /></StaggerItem>}
              {rest.slice(0, 2).map((item, index) => <StaggerItem key={item.id}><NewsCard item={item} index={index + 1} /></StaggerItem>)}
            </Stagger>
          ) : (
            <div className="mt-8"><EmptyState icon={CalendarDays} title="No announcements yet" text="Published notices will appear here." /></div>
          )}
        </div>

        <Reveal delay={0.1}>
          <div className="surface flex h-full flex-col p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Upcoming</p>
                <h3 className="mt-2 font-display text-2xl font-bold">Events &amp; dates</h3>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-100 text-gold-700"><CalendarDays className="h-5 w-5" /></span>
            </div>
            {events.length ? (
              <ul className="mt-5 -mx-3 flex-1 space-y-1">
                {events.slice(0, 5).map((event) => <EventRow key={event.id} event={event} />)}
              </ul>
            ) : (
              <p className="mt-6 flex-1 text-sm text-muted-foreground">The school calendar is being prepared.</p>
            )}
            <Button asChild variant="secondary" className="mt-6 w-full">
              <Link href="/events">Full calendar <ArrowUpRight /></Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
