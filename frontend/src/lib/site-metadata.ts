import type { Metadata } from 'next';

const SITE = 'Sombetini Primary School';

/** Shared title, description, and Open Graph for public pages. */
export function pageMetadata(
  title: string,
  description: string,
  options?: { path?: string; noIndex?: boolean },
): Metadata {
  const ogTitle = title === 'Home' ? SITE : `${title} · ${SITE}`;
  return {
    title,
    description,
    ...(options?.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      locale: 'en_TZ',
      ...(options?.path ? { url: options.path } : {}),
    },
    twitter: {
      card: 'summary',
      title: ogTitle,
      description,
    },
  };
}
