import Link from 'next/link';
import { ArrowUpRight, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Twitter, Youtube } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import type { SchoolSettings } from '@/lib/types';

const explore = [
  { href: '/about', label: 'About the school' },
  { href: '/academics', label: 'Academics' },
  { href: '/school-life', label: 'School life' },
  { href: '/gallery', label: 'Photo gallery' },
  { href: '/news', label: 'News & notices' },
  { href: '/events', label: 'Events calendar' },
];

const services = [
  { href: '/login?portal=parent', label: 'Parent Portal' },
  { href: '/login?portal=teacher', label: 'Teacher Portal' },
  { href: '/results', label: 'Verify a result' },
  { href: '/examinations', label: 'Examination calendar' },
  { href: '/resources', label: 'Documents & forms' },
  { href: '/terms', label: 'Terms of use' },
  { href: '/privacy', label: 'Privacy policy' },
];

export function Footer({ settings }: { settings?: SchoolSettings | null }) {
  const socials = [
    settings?.showFacebook && settings.facebookUrl ? { label: 'Facebook', href: settings.facebookUrl, icon: Facebook } : null,
    settings?.showInstagram && settings.instagramUrl ? { label: 'Instagram', href: settings.instagramUrl, icon: Instagram } : null,
    settings?.showYoutube && settings.youtubeUrl ? { label: 'YouTube', href: settings.youtubeUrl, icon: Youtube } : null,
    settings?.showTwitter && settings.twitterUrl ? { label: 'X', href: settings.twitterUrl, icon: Twitter } : null,
    settings?.showWhatsapp && settings.whatsappNumber ? { label: 'WhatsApp', href: `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`, icon: MessageCircle } : null,
  ].filter(Boolean) as { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];

  return (
    <footer className="relative mt-24 overflow-hidden bg-brand-950 text-white">
      <div className="kente-line h-1.5" />
      <div className="dot-grid absolute inset-0 opacity-20" />
      <div className="container-x relative">
        {/* CTA row */}
        <div className="-mt-12 grid gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-brand-800 to-brand-900 p-8 shadow-lift md:grid-cols-[1.4fr_1fr] md:items-center md:p-10">
          <div>
            <p className="eyebrow text-gold-300">Parents &amp; guardians</p>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Results, fees and school notices — in one place.</h2>
            <p className="mt-2 max-w-lg text-sm text-white/70">Sign in to the Parent Portal to follow every child on your account, download report cards, and generate payment control numbers.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/login?portal=parent" className="inline-flex h-12 items-center gap-2 rounded-full bg-gold-400 px-6 font-semibold text-brand-950 shadow-gold transition hover:bg-gold-300">
              Open Parent Portal <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex h-12 items-center rounded-full border border-white/25 px-6 font-semibold text-white transition hover:bg-white/10">
              Contact school
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo light logoUrl={settings?.logoUrl} name={settings?.schoolName?.split(' ')[0] || 'Sombetini'} />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/70">
              <span className="font-semibold text-white">{settings?.motto || 'Learning Today, Leading Tomorrow.'}</span>
              <br />
              A public primary school in Arusha where quality education, strong values, and a caring learning environment help every child grow with confidence.
            </p>
            {socials.length > 0 && (
              <ul className="mt-6 flex gap-2">
                {socials.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/80 transition hover:border-gold-300 hover:text-gold-300">
                      <item.icon className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:col-span-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-gold-300">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              {explore.map((item) => <li key={item.href}><Link href={item.href} className="hover:text-white">{item.label}</Link></li>)}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-gold-300">Services</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              {services.map((item) => <li key={item.href}><Link href={item.href} className="hover:text-white">{item.label}</Link></li>)}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-gold-300">Visit us</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" /><span>{settings?.address || 'Sombetini, Arusha, Tanzania'}<br />{settings?.postalAddress || 'P.O. Box 1234, Arusha'}</span></li>
              <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" /><a href={`tel:${settings?.phone}`} className="hover:text-white">{settings?.phone || '+255 27 250 1234'}</a></li>
              <li className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" /><a href={`mailto:${settings?.email}`} className="hover:text-white">{settings?.email || 'info@sombetini.ac.tz'}</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings?.schoolName || 'Sombetini Primary School'}. All rights reserved.</p>
          <p>Arusha City Council · Ministry of Education, Science and Technology</p>
        </div>
      </div>
    </footer>
  );
}
