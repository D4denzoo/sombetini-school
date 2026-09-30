import { Clock, ExternalLink, Mail, MapPin, Phone, Siren } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { getPublicSettings } from '@/lib/public-data';
import {
  SCHOOL_ADDRESS,
  SCHOOL_MAP_EMBED_URL,
  SCHOOL_MAP_LINK_URL,
} from '@/lib/school-identity';
import { PageHero } from '@/components/site/section-heading';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Contact',
  'Phone, email, map, and contact form for Sombetini Primary School, Arusha.',
  { path: '/contact' },
);

export default async function ContactPage() {
  const school = await getPublicSettings();
  const settings = school?.settings;
  const mapEmbedUrl = settings?.mapEmbedUrl?.trim() || SCHOOL_MAP_EMBED_URL;

  const cards = [
    { icon: MapPin, title: 'Visit', lines: [settings?.address || SCHOOL_ADDRESS, settings?.postalAddress || 'P.O. Box 1234, Arusha'] },
    { icon: Phone, title: 'Call', lines: [settings?.phone || '+255 27 250 1234', settings?.phone2 || ''].filter(Boolean), href: `tel:${settings?.phone}` },
    { icon: Mail, title: 'Email', lines: [settings?.email || 'info@sombetini.ac.tz'], href: `mailto:${settings?.email}` },
    { icon: Clock, title: 'Office hours', lines: [settings?.workingHours || 'Monday – Friday · 7:30 – 15:30'] },
  ];

  return (
    <>
      <PageHero eyebrow="Contact" title="We’re happy to hear from you" text="Questions about admission, fees, results or the Parent Portal? Call, write, or send a message and the school office will get back to you." />

      <section className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <StaggerItem key={card.title}>
                <article className="surface h-full p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200"><card.icon className="h-5 w-5" /></span>
                  <p className="mt-4 font-display font-bold">{card.title}</p>
                  {card.lines.map((line) => (
                    card.href ? <a key={line} href={card.href} className="block text-sm text-muted-foreground hover:text-foreground">{line}</a> : <p key={line} className="text-sm text-muted-foreground">{line}</p>
                  ))}
                </article>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="mt-4 flex items-start gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white"><Siren className="h-5 w-5" /></span>
            <div>
              <p className="font-display font-bold text-red-900 dark:text-red-200">Emergency contact</p>
              <p className="text-sm text-red-800/80 dark:text-red-200/70">For urgent matters concerning a pupil during school hours call <a href={`tel:${settings?.emergencyPhone}`} className="font-semibold underline">{settings?.emergencyPhone || 'the duty number at the school office'}</a>.</p>
            </div>
          </Reveal>

          <Reveal className="mt-6 overflow-hidden rounded-3xl border border-border">
            <iframe
              title="Sombetini Primary School on Google Maps"
              src={mapEmbedUrl}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">Sombetini Primary School · Sombetini Avenue, Arusha</p>
              <a
                href={SCHOOL_MAP_LINK_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"
              >
                Open in Maps <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <ContactForm />
        </Reveal>
      </section>
    </>
  );
}
