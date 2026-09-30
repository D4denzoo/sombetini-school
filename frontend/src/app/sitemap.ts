import type { MetadataRoute } from 'next';
import { publicGet } from '@/lib/api';
import type { Announcement, Paged } from '@/lib/types';

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

const staticPaths = [
  '',
  '/about',
  '/academics',
  '/school-life',
  '/news',
  '/events',
  '/examinations',
  '/results',
  '/resources',
  '/gallery',
  '/contact',
  '/terms',
  '/privacy',
  '/login',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/news' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/login' ? 0.5 : 0.7,
  }));

  const newsPage = await publicGet<Paged<Announcement>>('/announcements?limit=200');
  const articles: MetadataRoute.Sitemap = (newsPage?.data || [])
    .filter((item) => item.slug)
    .map((item) => ({
      url: `${base}/news/${item.slug}`,
      lastModified: item.publishedAt ? new Date(item.publishedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

  return [...staticEntries, ...articles];
}
