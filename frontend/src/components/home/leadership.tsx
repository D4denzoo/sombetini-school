'use client';

import { Quote, UserRound, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import type { Leader } from '@/lib/types';
import { HEAD_OF_SCHOOL_MESSAGE } from '@/lib/school-identity';
import { publicAssetUrl } from '@/lib/api';

function LeaderPhoto({ leader, large = false }: { leader: Partial<Leader>; large?: boolean }) {
  const src = publicAssetUrl(leader.photoUrl);
  if (src) {
    return <img src={src} alt={`${leader.name}, ${leader.position}`} className="h-full w-full object-cover" />;
  }
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-100 via-brand-50 to-gold-100 text-brand-600 dark:from-brand-900 dark:via-brand-950 dark:to-gold-700/30">
      <UserRound className={large ? 'h-24 w-24 opacity-50' : 'h-12 w-12 opacity-50'} strokeWidth={1.2} />
    </div>
  );
}

export function Leadership({ leadership }: { leadership: Leader[] }) {
  const head = leadership.find((person) => person.isHead) || leadership[0];
  const others = leadership.filter((person) => person.id !== head?.id);
  const [ref, embla] = useEmblaCarousel({ align: 'start', dragFree: true });
  const message = head?.welcomeMessage?.trim() || HEAD_OF_SCHOOL_MESSAGE;

  return (
    <section className="bg-secondary/60 py-20 dark:bg-secondary/20">
      <div className="container-x">
        <SectionHeading
          eyebrow="Message from the Head of School"
          title="A welcome to our school family"
          text="From the Head of School to parents, guardians, learners, and visitors."
        />

        <Reveal className="mt-10 surface overflow-hidden">
          <div className="grid lg:grid-cols-[18rem_1fr]">
            <div className="aspect-[4/5] lg:aspect-auto lg:min-h-[28rem]">
              <LeaderPhoto leader={head || {}} large />
            </div>
            <div className="flex flex-col p-7 sm:p-10">
              <Quote className="h-8 w-8 shrink-0 text-gold-400" />
              <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-muted-foreground">
                {message}
              </div>
              <div className="mt-8 border-t border-border pt-5">
                <p className="font-display text-lg font-bold">{head?.name || 'Head of School'}</p>
                <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                  {head?.position || 'Head of School'} · Sombetini Primary School
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {others.length > 0 && (
          <Reveal delay={0.1} className="mt-10 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">Leadership team</p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon-sm" onClick={() => embla?.scrollPrev()} aria-label="Previous"><ChevronLeft /></Button>
                <Button variant="outline" size="icon-sm" onClick={() => embla?.scrollNext()} aria-label="Next"><ChevronRight /></Button>
              </div>
            </div>
            <div ref={ref} className="overflow-hidden">
              <div className="flex gap-4">
                {others.map((person) => (
                  <article key={person.id} className="surface surface-hover min-w-[15.5rem] flex-[0_0_62%] overflow-hidden sm:flex-[0_0_48%]">
                    <div className="aspect-[4/3]"><LeaderPhoto leader={person} /></div>
                    <div className="p-5">
                      <p className="font-display text-base font-bold">{person.name}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{person.position}</p>
                      {person.biography && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{person.biography}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
