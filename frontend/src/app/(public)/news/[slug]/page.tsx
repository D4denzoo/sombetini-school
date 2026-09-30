import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/site-metadata';
import { ArrowLeft, Calendar, Download, Paperclip, UserRound } from 'lucide-react';
import { publicGet, publicAssetUrl } from '@/lib/api';
import type { Announcement, Paged } from '@/lib/types';
import { Badge, categoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/site/smart-image';
import { NewsCard } from '@/components/home/news-events';
import { Reveal } from '@/components/motion';
import { formatDate, humanize } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await publicGet<Announcement>(`/announcements/${slug}`);
  if (!article) return pageMetadata('News', 'Announcement not found.', { path: '/news' });
  const summary = article.description?.replace(/\s+/g, ' ').trim().slice(0, 155) || 'News from Sombetini Primary School.';
  return pageMetadata(article.title, summary, { path: `/news/${slug}` });
}

export default async function NewsArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, more] = await Promise.all([
    publicGet<Announcement>(`/announcements/${slug}`),
    publicGet<Paged<Announcement>>('/announcements?limit=4'),
  ]);
  if (!article) notFound();
  const related = (more?.data || []).filter((item) => item.id !== article.id).slice(0, 3);

  return (
    <>
      <section className="hero-mesh border-b border-border/60">
        <div className="container-x py-12 sm:py-16">
          <Reveal>
            <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All announcements</Link>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant={categoryBadge(article.category)}>{humanize(article.category)}</Badge>
              {article.publishedAt && <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDate(article.publishedAt)}</span>}
              {article.author && <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" /> {article.author.firstName} {article.author.lastName}</span>}
            </div>
            <h1 className="mt-4 max-w-4xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{article.title}</h1>
          </Reveal>
        </div>
      </section>

      <article className="container-x grid gap-12 py-14 lg:grid-cols-[1fr_20rem]">
        <div>
          {article.featuredImage && <SmartImage src={article.featuredImage} alt="" className="mb-8 aspect-[16/8] rounded-[2rem] shadow-card" />}
          <div className="prose-school max-w-3xl whitespace-pre-wrap text-base leading-8 text-foreground/90">{article.description}</div>

          {article.attachments?.length ? (
            <div className="mt-10 surface p-6">
              <p className="flex items-center gap-2 font-display font-bold"><Paperclip className="h-4 w-4 text-brand-600" /> Attachments</p>
              <ul className="mt-4 space-y-2">
                {article.attachments.map((file) => (
                  <li key={file.id}>
                    <a href={publicAssetUrl(file.fileUrl)} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm transition hover:border-brand-300 hover:bg-secondary">
                      <span className="truncate font-medium">{file.fileName}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">{(file.fileSize / 1024).toFixed(0)} KB <Download className="h-4 w-4" /></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="dark-band rounded-3xl p-6 text-white">
            <p className="eyebrow text-gold-300">Parents</p>
            <p className="mt-2 font-display text-lg font-bold">See notices inside your portal</p>
            <p className="mt-1 text-sm text-white/70">Signed-in parents also receive announcements as notifications.</p>
            <Button asChild variant="gold" className="mt-4 w-full"><Link href="/login?portal=parent">Open Parent Portal</Link></Button>
          </div>
          {related.length > 0 && (
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">More news</p>
              <div className="mt-3 grid gap-4">{related.map((item, index) => <NewsCard key={item.id} item={item} index={index + 3} />)}</div>
            </div>
          )}
        </aside>
      </article>
    </>
  );
}
