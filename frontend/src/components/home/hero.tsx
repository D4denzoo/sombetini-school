'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Heart, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/site/smart-image';
import { featuredPhotos } from '@/lib/featured-photos';
import type { Stats } from '@/lib/types';
import { resolveMotto } from '@/lib/school-identity';

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero({ motto, stats, yearsOfService }: { motto?: string | null; stats?: Stats | null; nextExam?: unknown; yearsOfService?: number }) {
  const displayMotto = resolveMotto(motto);
  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-brand-950 text-white">
      <SmartImage {...featuredPhotos[0]} className="absolute inset-0 h-full w-full" imgClassName="object-cover scale-105" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/88 to-brand-950/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-transparent to-brand-950/40" />
      <div className="khanga absolute inset-x-0 top-0 z-10 h-1.5 opacity-90" />

      <div className="container-x relative z-10 flex min-h-[92vh] flex-col justify-end pb-16 pt-28 lg:justify-center lg:pb-28 lg:pt-20">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-300"
        >
          Arusha · Tanzania
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease }}
          className="mt-5 font-display text-2xl italic text-white/80 sm:text-3xl"
        >
          Welcome to
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease }}
          className="mt-2 max-w-4xl font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.4rem]"
        >
          Sombetini Primary School
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.16, ease }}
          className="mt-6 max-w-2xl text-lg leading-8 text-white/78"
        >
          A place where young minds learn, grow, and build the confidence to shape tomorrow. We are committed to
          providing quality education, nurturing character, and creating a supportive environment where every child can
          thrive.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
          className="mt-5 font-display text-xl italic text-gold-300 sm:text-2xl"
        >
          {displayMotto}
        </motion.p>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="mt-3 text-sm tracking-wide text-white/65">
          Knowledge · Integrity · Service · Excellence · Discipline · Respect · Creativity · Unity
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <Button asChild size="lg" variant="gold">
            <Link href="/about">
              About our school <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="inverse">
            <Link href="/school-life">
              <Heart /> School life
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline-inverse">
            <Link href="/academics">
              <BookOpen /> Academics
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
            <Link href="/contact">
              <Phone /> Contact us
            </Link>
          </Button>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70"
        >
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold-300" /> Government registered
          </li>
          <li>{yearsOfService ? `${yearsOfService}+ years serving Arusha` : 'Serving Arusha since 1985'}</li>
          <li>Standard 1 – 7</li>
          {stats?.currentAcademicYear && <li>{stats.currentAcademicYear}</li>}
        </motion.ul>
      </div>
    </section>
  );
}
