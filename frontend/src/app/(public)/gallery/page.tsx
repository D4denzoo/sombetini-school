import Link from 'next/link';
import { Images } from 'lucide-react';
import { publicGet } from '@/lib/api';
import type { Paged } from '@/lib/types';
import { PageHero } from '@/components/site/section-heading';
import { SmartImage } from '@/components/site/smart-image';
import { Stagger, StaggerItem } from '@/components/motion';
import { EmptyState } from '@/components/ui/skeleton';
import { featuredPhotos } from '@/lib/featured-photos';
import { cn, humanize } from '@/lib/utils';

type Album = { id: string; title: string; description?: string | null; category: string; coverUrl?: string | null; _count?: { images: number } };

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Gallery',
  'Photos from campus, sports, and school events at Sombetini Primary School.',
  { path: '/gallery' },
);

const categories = ['CAMPUS', 'CLASSROOMS', 'SPORTS', 'ACADEMIC_EVENTS', 'GRADUATION', 'SCHOOL_TRIPS', 'COMPETITIONS', 'TEACHERS', 'STUDENTS', 'OTHER'];
const tones = ['forest', 'gold', 'sky', 'clay'] as const;

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const albums = await publicGet<Paged<Album>>(`/gallery/albums?limit=40${category ? `&category=${category}` : ''}`);
  const photos = featuredPhotos.filter((photo) => !category || photo.category === category);
  const items = albums?.data || [];

  return (
    <>
      <PageHero eyebrow="Photo gallery" title="Life at Sombetini in pictures" text="Campus, classrooms, sports, academic events, graduation, trips, and competitions." />

      <section className="container-x py-12">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Link href="/gallery" className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition', !category ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:bg-secondary')}>All</Link>
          {categories.map((item) => (
            <Link key={item} href={`/gallery?category=${item}`} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition', category === item ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:bg-secondary')}>{humanize(item)}</Link>
          ))}
        </div>

        {photos.length > 0 && (
          <Stagger className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {photos.map((photo, index) => (
              <StaggerItem key={photo.src}>
                <figure className="group surface overflow-hidden">
                  <SmartImage {...photo} label={photo.title} className={cn(photo.wide || index % 3 === 0 ? 'aspect-[4/3]' : 'aspect-[3/4]')} imgClassName="transition-transform duration-500 group-hover:scale-105" />
                  <figcaption className="flex items-center justify-between p-4">
                    <span className="font-display font-bold">{photo.title}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{humanize(photo.category)}</span>
                  </figcaption>
                </figure>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {items.length > 0 && (
          <>
            <h2 className="mt-14 font-display text-2xl font-bold">Albums</h2>
            <Stagger className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((album, index) => (
                <StaggerItem key={album.id}>
                  <article className="group surface surface-hover overflow-hidden">
                    <SmartImage src={album.coverUrl} alt="" motif="campus" tone={tones[index % tones.length]} label={album.title} className="aspect-[16/10]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                    <div className="p-5">
                      <h3 className="font-display text-lg font-bold">{album.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{humanize(album.category)} · {album._count?.images || 0} photos</p>
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </>
        )}

        {!items.length && !photos.length && <div className="mt-8"><EmptyState icon={Images} title="No albums in this category yet" text="Browse another category, or visit again soon for new photographs." /></div>}
      </section>
    </>
  );
}
