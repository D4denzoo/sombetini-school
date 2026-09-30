import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Initial setup',
  'Create the first school administrator account for the Sombetini platform.',
  { path: '/setup', noIndex: true },
);

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
