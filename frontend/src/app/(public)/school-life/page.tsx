import Link from 'next/link';
import { ArrowRight, Bell, BookOpen, Coffee, Flag, Sun, Trophy, Users, Music, Leaf } from 'lucide-react';
import { PageHero, SectionHeading } from '@/components/site/section-heading';
import { SmartImage } from '@/components/site/smart-image';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { featuredPhotos } from '@/lib/featured-photos';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'School Life',
  'Campus life, activities, and community at Sombetini Primary School.',
  { path: '/school-life' },
);

const day = [
  { time: '07:15', icon: Sun, title: 'Arrival & registration', text: 'Pupils arrive, class teachers take attendance.' },
  { time: '07:30', icon: Flag, title: 'Morning assembly', text: 'National anthem, announcements and the thought of the day.' },
  { time: '08:00', icon: BookOpen, title: 'Morning lessons', text: 'Core subjects when concentration is highest.' },
  { time: '10:30', icon: Coffee, title: 'Break & porridge', text: 'Supervised play and a healthy snack.' },
  { time: '11:00', icon: BookOpen, title: 'Late morning lessons', text: 'Science, social studies, languages and ICT.' },
  { time: '13:00', icon: Users, title: 'Lunch', text: 'Meals for pupils on the school feeding programme.' },
  { time: '14:00', icon: Trophy, title: 'Clubs & sports', text: 'Football, netball, athletics, music, debate and environment club.' },
  { time: '15:30', icon: Bell, title: 'Dismissal', text: 'Pupils leave; homework club for upper primary.' },
];

const clubs = [
  { icon: Trophy, title: 'Sports', text: 'Football, netball, athletics and inter-school competitions.' },
  { icon: Music, title: 'Music & culture', text: 'Choir, traditional dance and drama for cultural days.' },
  { icon: Users, title: 'Debate & scouting', text: 'Public speaking, leadership and community service.' },
  { icon: Leaf, title: 'Environment club', text: 'Tree planting, school garden and clean-up days.' },
];

export default function SchoolLifePage() {
  return (
    <>
      <PageHero eyebrow="School life" title="More than lessons — a place to grow" text="Days at Sombetini begin with assembly and move through lessons, play, clubs and the routines that teach children to look after one another." />

      <section className="container-x py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SmartImage {...featuredPhotos[0]} label={featuredPhotos[0].title} className="rounded-[2rem] shadow-card sm:col-span-2 lg:col-span-3 aspect-[16/9] sm:aspect-[21/9]" />
          <SmartImage {...featuredPhotos[1]} label={featuredPhotos[1].title} className="aspect-square rounded-[2rem] shadow-card" />
          <SmartImage {...featuredPhotos[5]} label={featuredPhotos[5].title} className="aspect-square rounded-[2rem] shadow-card" />
          <SmartImage {...featuredPhotos[3]} label={featuredPhotos[3].title} className="aspect-square rounded-[2rem] shadow-card" />
        </div>
      </section>

      <section className="bg-secondary/60 py-20 dark:bg-secondary/20">
        <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="eyebrow">A typical day</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">From the first bell to the last</h2>
            <p className="mt-4 text-muted-foreground">A predictable rhythm helps children feel safe and ready to learn. Times may vary on examination and event days.</p>
            <Button asChild className="mt-8" variant="outline"><Link href="/events">See the school calendar <ArrowRight /></Link></Button>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="relative space-y-2 border-l-2 border-brand-200 pl-6 dark:border-brand-800">
              {day.map((slot) => (
                <li key={slot.time} className="relative rounded-2xl p-3 transition hover:bg-card">
                  <span className="absolute -left-[2.05rem] top-4 grid h-6 w-6 place-items-center rounded-full bg-brand-600 ring-4 ring-background"><slot.icon className="h-3 w-3 text-white" /></span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm font-bold text-brand-700 dark:text-brand-300">{slot.time}</span>
                    <p className="font-display font-bold">{slot.title}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{slot.text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="container-x py-20">
        <SectionHeading eyebrow="Beyond the classroom" title="Clubs, sports and culture" action={{ href: '/gallery', label: 'Photo gallery' }} />
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {clubs.map((club) => (
            <StaggerItem key={club.title}>
              <article className="surface surface-hover h-full p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-100 text-gold-700"><club.icon className="h-5 w-5" /></span>
                <h3 className="mt-5 font-display text-lg font-bold">{club.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{club.text}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
