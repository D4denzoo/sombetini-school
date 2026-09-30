import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Sign in',
  'Parent, teacher, and administration sign-in for the Sombetini digital platform.',
  { path: '/login', noIndex: true },
);

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
