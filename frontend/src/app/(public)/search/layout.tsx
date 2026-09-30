import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Search',
  'Search news, documents, events, and pages on the Sombetini Primary School website.',
  { path: '/search' },
);

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
