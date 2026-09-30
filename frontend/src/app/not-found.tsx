import { Footer } from '@/components/site/footer';
import { Header } from '@/components/site/header';
import { NotFoundContent } from '@/components/site/not-found-content';
import { getPublicSettings } from '@/lib/public-data';

export default async function NotFound() {
  const data = await getPublicSettings();
  return (
    <>
      <Header settings={data?.settings} />
      <main id="main">
        <NotFoundContent />
      </main>
      <Footer settings={data?.settings} />
    </>
  );
}
