import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { publicGet } from '@/lib/api';
import type { Announcement, Paged } from '@/lib/types';
import { PageHero } from '@/components/site/section-heading';
import { NewsCard } from '@/components/home/news-events';
import { Stagger, StaggerItem } from '@/components/motion';
import { EmptyState } from '@/components/ui/skeleton';
import { cn, humanize } from '@/lib/utils';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'News & Announcements',
  'Official notices and news from Sombetini Primary School.',
  { path: '/news' },
);

const categories = ['GENERAL', 'EXAMINATION', 'ACADEMIC', 'PARENT_MEETING', 'HOLIDAY', 'SPORTS', 'CULTURAL', 'EMERGENCY'];

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const { category, page = '1' } = await searchParams;
  const news = await publicGet<Paged<Announcement>>(`/announcements?limit=12&page=${page}${category ? `&category=${category}` : ''}`);
  const items = news?.data || [];
  const meta = news?.meta;

  return (
    <>
      <PageHero eyebrow="News & announcements" title="Official notices from the school" text="Examination announcements, parent meetings, holidays, academic updates and emergency notices — published by the school office." />

      <section className="container-x py-12">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Link href="/news" className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition', !category ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:border-brand-300 hover:bg-secondary')}>All</Link>
          {categories.map((item) => (
            <Link key={item} href={`/news?category=${item}`} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition', category === item ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:border-brand-300 hover:bg-secondary')}>
              {humanize(item)}
            </Link>
          ))}
        </div>

        {items.length ? (
          <Stagger className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <StaggerItem key={item.id} className={cn(index === 0 && Number(page) === 1 && 'md:col-span-2 lg:col-span-2')}>
                <NewsCard item={item} index={index} featured={index === 0 && Number(page) === 1} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className="mt-8"><EmptyState icon={Newspaper} title="No announcements in this category" text="Try another category or check back soon." /></div>
        )}

        {meta && meta.totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`/news?page=${n}${category ? `&category=${category}` : ''}`} className={cn('grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold', n === meta.page ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:bg-secondary')}>{n}</Link>
            ))}
          </nav>
        )}
      </section>
    </>
  );
}
