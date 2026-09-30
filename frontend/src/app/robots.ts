import type { MetadataRoute } from 'next';

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const base = siteOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/portal/', '/api/', '/setup'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
