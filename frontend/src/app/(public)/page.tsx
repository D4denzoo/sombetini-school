import { pageMetadata } from '@/lib/site-metadata';
import { getLatestNews, getPublicSettings, getUpcomingEvents } from '@/lib/public-data';

export const metadata = pageMetadata(
  'Home',
  'Sombetini Primary School in Arusha — public site, parent and teacher portals, results, fees, and school notices.',
  { path: '/' },
);
import { Hero } from '@/components/home/hero';
import { Portals } from '@/components/home/portals';
import { Journey } from '@/components/home/journey';
import { StatsBand } from '@/components/home/stats';
import { AboutBand } from '@/components/home/about-band';
import { Leadership } from '@/components/home/leadership';
import { NewsEvents } from '@/components/home/news-events';
import { GalleryStrip } from '@/components/home/gallery-strip';
import { AssistantCta } from '@/components/home/assistant-cta';

export default async function HomePage() {
  const [school, news, events] = await Promise.all([
    getPublicSettings(),
    getLatestNews(3),
    getUpcomingEvents(6),
  ]);

  const settings = school?.settings;
  const upcoming = events?.data || [];
  const nextExam = upcoming.find((event) => event.category === 'EXAMINATION') || null;

  return (
    <>
      <Hero motto={settings?.motto} stats={school?.stats} nextExam={nextExam} yearsOfService={settings?.yearsOfService} />
      <Portals />
      <Journey />
      <StatsBand stats={school?.stats} yearsOfService={settings?.yearsOfService} />
      <AboutBand settings={settings} />
      <Leadership leadership={school?.leadership || []} />
      <NewsEvents news={news?.data || []} events={upcoming} />
      <GalleryStrip />
      <AssistantCta />
    </>
  );
}
