import Link from 'next/link';
import { Award, BookOpenCheck, Compass, Eye, Heart, History, Lightbulb, Quote, UserRound } from 'lucide-react';
import {
  resolveCoreValues,
  resolveHistory,
  resolveMission,
  resolveMotto,
  resolvePhilosophy,
  resolveVision,
  SCHOOL_PHILOSOPHY_STATEMENT,
  HEAD_OF_SCHOOL_MESSAGE,
} from '@/lib/school-identity';
import { getPublicSettings } from '@/lib/public-data';
import { PageHero, SectionHeading } from '@/components/site/section-heading';
import { SmartImage } from '@/components/site/smart-image';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { featuredPhotos } from '@/lib/featured-photos';
import { publicAssetUrl } from '@/lib/api';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'About Us',
  'History, vision, mission, and leadership at Sombetini Primary School, Arusha.',
  { path: '/about' },
);

export default async function AboutPage() {
  const school = await getPublicSettings();
  const settings = school?.settings;
  const leadership = school?.leadership || [];
  const motto = resolveMotto(settings?.motto);
  const philosophy = resolvePhilosophy(settings?.academicPhilosophy);
  const values = resolveCoreValues(settings?.coreValues);
  const history = resolveHistory(settings?.history);

  const pillars = [
    { icon: Eye, title: 'Vision', body: resolveVision(settings?.vision) },
    { icon: Compass, title: 'Mission', body: resolveMission(settings?.mission) },
    { icon: Lightbulb, title: 'Educational philosophy', body: philosophy },
  ];

  return (
    <>
      <PageHero
        eyebrow="About the school"
        title={settings?.schoolName || 'Sombetini Primary School'}
        text={settings?.schoolNameSw ? `${settings.schoolNameSw} · ${motto}` : motto}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link href="/academics">Academic programme</Link></Button>
          <Button asChild variant="outline"><Link href="/contact">Visit or contact us</Link></Button>
        </div>
      </PageHero>

      <section className="container-x py-16">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Our motto</p>
          <p className="mt-4 font-display text-3xl font-bold tracking-tight text-brand-800 dark:text-brand-200 sm:text-4xl">
            {motto}
          </p>
        </Reveal>
      </section>

      <section className="container-x grid gap-12 py-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal className="relative">
          <SmartImage {...featuredPhotos[7]} label="Community" className="aspect-[4/3] rounded-[2rem] shadow-card" />
          <div className="absolute -bottom-6 right-6 max-w-[16rem] rounded-2xl border border-border bg-card p-5 shadow-lift">
            <History className="h-5 w-5 text-gold-500" />
            <p className="mt-2 font-display text-3xl font-extrabold text-brand-700">{settings?.yearsOfService || 41}+ years</p>
            <p className="text-sm text-muted-foreground">serving families in Sombetini ward, Arusha.</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="eyebrow">Our history</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">A neighbourhood school with a long memory</h2>
          <div className="prose-school mt-5 whitespace-pre-wrap">{history}</div>
        </Reveal>
      </section>

      <section className="bg-secondary/60 py-20 dark:bg-secondary/20">
        <div className="container-x">
          <SectionHeading eyebrow="What guides us" title="Vision, mission and how we teach" align="center" />
          <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => (
              <StaggerItem key={pillar.title}>
                <article className="surface h-full p-7">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft"><pillar.icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 font-display text-xl font-bold">{pillar.title}</h3>
                  <p className="prose-school mt-3 whitespace-pre-wrap">{pillar.body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="container-x py-20">
        <SectionHeading
          eyebrow="Core values"
          title="The habits we build every day"
          text="These seven values shape how learners, teachers, and families work together at Sombetini."
        />
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => (
            <StaggerItem key={value.name}>
              <article className="surface h-full p-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                  <Heart className="h-3.5 w-3.5 text-gold-500" /> {value.name}
                </span>
                {value.description && (
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{value.description}</p>
                )}
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="bg-brand-950 py-20 text-white">
        <div className="container-x mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="eyebrow text-gold-300">Educational philosophy</p>
            <Quote className="mx-auto mt-6 h-8 w-8 text-gold-400" />
            <p className="mt-4 font-display text-2xl font-semibold leading-snug sm:text-3xl">
              “{SCHOOL_PHILOSOPHY_STATEMENT}”
            </p>
            <div className="prose-school mx-auto mt-8 whitespace-pre-wrap text-left text-white/75 [&_p]:text-white/75">
              {philosophy
                .split('\n')
                .filter((line) => line.trim() && line.trim() !== SCHOOL_PHILOSOPHY_STATEMENT)
                .join('\n')}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-x grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="eyebrow">Achievements</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Proud of our pupils, proud of our results</h2>
          <p className="prose-school mt-5 whitespace-pre-wrap">{settings?.achievements || 'Our school has won regional education awards and our pupils continue to perform well in secondary school.'}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Award, title: 'Regional recognition', text: 'Awards in academic and co-curricular competitions.' },
              { icon: BookOpenCheck, title: 'Strong transitions', text: 'Standard 7 leavers progress confidently to secondary school.' },
            ].map((item) => (
              <li key={item.title} className="flex gap-3 rounded-2xl border border-border p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700"><item.icon className="h-5 w-5" /></span>
                <div><p className="font-display font-bold">{item.title}</p><p className="text-sm text-muted-foreground">{item.text}</p></div>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <SmartImage {...featuredPhotos[4]} label="Sports" className="aspect-[4/5] rounded-[2rem] shadow-card sm:aspect-[3/4]" />
        </Reveal>
      </section>

      <section className="container-x py-20">
        <SectionHeading
          eyebrow="Message from the Head of School"
          title="Welcome to our school family"
        />
        {(() => {
          const head = leadership.find((person) => person.isHead) || leadership[0];
          const message = head?.welcomeMessage?.trim() || HEAD_OF_SCHOOL_MESSAGE;
          return (
            <Reveal className="mt-10 surface overflow-hidden">
              <div className="grid lg:grid-cols-[16rem_1fr]">
                <div className="aspect-[4/5] bg-gradient-to-br from-brand-100 via-brand-50 to-gold-100 dark:from-brand-900 dark:to-gold-700/20 lg:aspect-auto">
                  {publicAssetUrl(head?.photoUrl) ? (
                    <img src={publicAssetUrl(head?.photoUrl)} alt={head.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full min-h-[16rem] place-items-center text-brand-600 opacity-50">
                      <UserRound className="h-20 w-20" strokeWidth={1.2} />
                    </div>
                  )}
                </div>
                <div className="p-7 sm:p-10">
                  <Quote className="h-7 w-7 text-gold-500" />
                  <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-muted-foreground">{message}</div>
                  <div className="mt-8 border-t border-border pt-5">
                    <p className="font-display text-lg font-bold">{head?.name || 'Head of School'}</p>
                    <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                      {head?.position || 'Head of School'} · Sombetini Primary School
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })()}
      </section>
    </>
  );
}
