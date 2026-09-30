'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { CalendarDays, FileText, HelpCircle, Library, Newspaper, Search as SearchIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHero } from '@/components/site/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, Skeleton } from '@/components/ui/skeleton';
import { cn, humanize } from '@/lib/utils';

type Hit = { type: string; id: string; title: string; description?: string; url?: string; category?: string };

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = { announcement: Newspaper, event: CalendarDays, document: FileText, resource: Library, faq: HelpCircle };

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') || '';
  const [query, setQuery] = useState(q);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setQuery(q);
    if (q.length < 2) { setHits([]); return; }
    setLoading(true);
    api<{ results: Hit[] }>(`/search?q=${encodeURIComponent(q)}`)
      .then((data) => setHits(data.results))
      .catch(() => setHits([]))
      .finally(() => setLoading(false));
  }, [q]);

  const types = Array.from(new Set(hits.map((hit) => hit.type)));
  const visible = filter === 'all' ? hits : hits.filter((hit) => hit.type === filter);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length > 1) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      <PageHero eyebrow="Search" title={q ? `Results for “${q}”` : 'Search the school site'} text="Announcements, events, documents, learning resources and frequently asked questions.">
        <form onSubmit={submit} className="flex max-w-2xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tafuta… e.g. mtihani, ada, kalenda" className="h-12 pl-11" aria-label="Search" autoFocus />
          </div>
          <Button type="submit" size="lg">Search</Button>
        </form>
      </PageHero>

      <section className="container-x py-12">
        {types.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {['all', ...types].map((type) => (
              <button key={type} type="button" onClick={() => setFilter(type)} className={cn('rounded-full border px-4 py-2 text-sm font-medium transition', filter === type ? 'border-brand-600 bg-brand-600 text-white' : 'border-border hover:bg-secondary')}>
                {type === 'all' ? `All (${hits.length})` : `${humanize(type)}s (${hits.filter((h) => h.type === type).length})`}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="mt-6 grid gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : visible.length ? (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {visible.map((hit) => {
              const Icon = typeIcon[hit.type] || FileText;
              const inner = (
                <div className="surface surface-hover flex h-full gap-4 p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-brand-700 dark:text-brand-200"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2"><Badge variant="outline">{humanize(hit.type)}</Badge>{hit.category && <Badge variant="neutral">{humanize(hit.category)}</Badge>}</div>
                    <p className="mt-2 font-display text-base font-bold leading-snug">{hit.title}</p>
                    {hit.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hit.description}</p>}
                  </div>
                </div>
              );
              return <li key={`${hit.type}-${hit.id}`}>{hit.url ? <Link href={hit.url}>{inner}</Link> : inner}</li>;
            })}
          </ul>
        ) : (
          <div className="mt-6"><EmptyState icon={SearchIcon} title={q ? 'No matches found' : 'Type at least two characters'} text={q ? 'Try a different word, or ask Msaidizi wa Sombetini using the button at the bottom right.' : undefined} /></div>
        )}
      </section>
    </>
  );
}

export default function SearchPage() {
  return <Suspense><SearchResults /></Suspense>;
}
