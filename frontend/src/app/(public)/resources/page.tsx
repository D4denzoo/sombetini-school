import Link from 'next/link';
import { Download, Eye, FileText, FolderOpen, Search } from 'lucide-react';
import { publicGet, publicAssetUrl } from '@/lib/api';
import type { Paged } from '@/lib/types';
import { PageHero } from '@/components/site/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/skeleton';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { cn, formatDate, humanize } from '@/lib/utils';

type DocumentItem = { id: string; title: string; description?: string | null; category: string; publishedAt?: string | null; createdAt?: string; fileUrl: string; fileSize?: number; mimeType?: string; downloadCount?: number };

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Resources & Documents',
  'Download school forms, calendars, fee structures, and official documents.',
  { path: '/resources' },
);

const categories = ['CALENDAR', 'EXAM_TIMETABLE', 'SCHOOL_RULES', 'PARENT_GUIDELINES', 'FEE_STRUCTURE', 'ADMISSION', 'ACADEMIC', 'FORMS', 'NOTICES', 'OTHER'];

function fileMeta(doc: DocumentItem) {
  const ext = doc.mimeType?.includes('pdf') ? 'PDF' : doc.mimeType?.includes('word') ? 'DOCX' : doc.mimeType?.includes('sheet') ? 'XLSX' : doc.fileUrl.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
  const size = doc.fileSize ? (doc.fileSize > 1_000_000 ? `${(doc.fileSize / 1_000_000).toFixed(1)} MB` : `${Math.round(doc.fileSize / 1024)} KB`) : '';
  return { ext, size };
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const query = await searchParams;
  const docs = await publicGet<Paged<DocumentItem>>(`/documents?limit=60${query.category ? `&category=${query.category}` : ''}`);
  const filtered = (docs?.data || []).filter((doc) => !query.q || `${doc.title} ${doc.description || ''}`.toLowerCase().includes(query.q.toLowerCase()));
  const counts = (docs?.data || []).reduce<Record<string, number>>((acc, doc) => ({ ...acc, [doc.category]: (acc[doc.category] || 0) + 1 }), {});

  return (
    <>
      <PageHero eyebrow="Resources" title="School documents & forms" text="The school calendar, examination timetables, rules, parent guidelines, fee structure, admission information and official forms — all in one library.">
        <form method="get" className="flex max-w-2xl flex-col gap-3 sm:flex-row">
          {query.category && <input type="hidden" name="category" value={query.category} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={query.q || ''} placeholder="Search documents…" className="h-12 pl-11" aria-label="Search documents" />
          </div>
          <Button type="submit" size="lg">Search</Button>
        </form>
      </PageHero>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
          <ul className="mt-3 space-y-1">
            <li><Link href="/resources" className={cn('flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium', !query.category ? 'bg-brand-600 text-white' : 'hover:bg-secondary')}>All documents <span className="text-xs opacity-70">{docs?.meta?.total ?? 0}</span></Link></li>
            {categories.map((item) => (
              <li key={item}>
                <Link href={`/resources?category=${item}`} className={cn('flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium', query.category === item ? 'bg-brand-600 text-white' : 'hover:bg-secondary')}>
                  {humanize(item)} {counts[item] ? <span className="text-xs opacity-70">{counts[item]}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 lg:hidden">
            <form method="get">
              <Select name="category" defaultValue={query.category || ''} aria-label="Category">
                <option value="">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}
              </Select>
            </form>
          </div>
        </aside>

        <div>
          <Reveal className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filtered.length} document{filtered.length === 1 ? '' : 's'}{query.q ? ` matching “${query.q}”` : ''}{query.category ? ` in ${humanize(query.category)}` : ''}</p>
          </Reveal>
          {filtered.length ? (
            <Stagger className="mt-4 grid gap-4 md:grid-cols-2">
              {filtered.map((doc) => {
                const meta = fileMeta(doc);
                const href = publicAssetUrl(doc.fileUrl);
                return (
                  <StaggerItem key={doc.id}>
                    <article className="surface surface-hover flex h-full gap-4 p-5">
                      <span className="grid h-14 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-brand-600 to-brand-800 text-[10px] font-bold text-white shadow-soft">
                        <FileText className="mb-0.5 h-5 w-5" /> {meta.ext}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline">{humanize(doc.category)}</Badge>
                        <h3 className="mt-2 font-display text-base font-bold leading-snug">{doc.title}</h3>
                        {doc.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(doc.publishedAt || doc.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}{meta.size ? ` · ${meta.size}` : ''}{doc.downloadCount ? ` · ${doc.downloadCount} downloads` : ''}</span>
                          <span className="flex gap-1">
                            <Button asChild variant="ghost" size="sm"><a href={href} target="_blank" rel="noreferrer"><Eye /> View</a></Button>
                            <Button asChild variant="secondary" size="sm"><a href={href} download><Download /> Download</a></Button>
                          </span>
                        </div>
                      </div>
                    </article>
                  </StaggerItem>
                );
              })}
            </Stagger>
          ) : (
            <div className="mt-4"><EmptyState icon={FolderOpen} title="No documents found" text="Try another category or search term, or contact the school office for the form you need." /></div>
          )}
        </div>
      </section>
    </>
  );
}
