import { Suspense } from 'react';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { Assistant } from '@/components/site/assistant';
import { CookieNotice } from '@/components/site/cookie-notice';
import { NavProgress } from '@/components/site/nav-progress';
import { getPublicSettings } from '@/lib/public-data';

/** Public marketing pages can be cached briefly; settings change rarely. */
export const revalidate = 120;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const data = await getPublicSettings();
  return (
    <>
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <Header settings={data?.settings} />
      <main id="main">{children}</main>
      <Footer settings={data?.settings} />
      <Assistant />
      <CookieNotice />
    </>
  );
}
