'use client';

import Link from 'next/link';
import { ArrowRight, Compass, Eye, Heart, Lightbulb } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/site/smart-image';
import { Reveal } from '@/components/motion';
import { featuredPhotos } from '@/lib/featured-photos';
import type { SchoolSettings } from '@/lib/types';
import { resolveCoreValues, resolveHistory, resolveMission, resolveMotto, resolvePhilosophy, resolveVision } from '@/lib/school-identity';

export function AboutBand({ settings }: { settings?: SchoolSettings | null }) {
  const motto = resolveMotto(settings?.motto);
  const philosophy = resolvePhilosophy(settings?.academicPhilosophy);
  const values = resolveCoreValues(settings?.coreValues);
  const history = resolveHistory(settings?.history);
  const vision = resolveVision(settings?.vision);
  const mission = resolveMission(settings?.mission);

  return (
    <section className="container-x py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative">
          <div className="grid grid-cols-2 gap-4">
            <SmartImage {...featuredPhotos[1]} label="Our pupils" className="aspect-[4/5] rounded-[2rem] shadow-card" />
            <div className="flex flex-col gap-4">
              <div className="rounded-[2rem] bg-brand-600 p-6 text-white shadow-card">
                <Heart className="h-6 w-6 text-gold-300" />
                <p className="mt-4 font-display text-xl font-bold leading-snug">{motto}</p>
                <p className="mt-2 text-sm text-white/70">Our motto guides every lesson and every assembly.</p>
              </div>
              <SmartImage {...featuredPhotos[3]} label="Culture" className="flex-1 min-h-40 rounded-[2rem] shadow-card" />
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-lift">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Established</p>
            <p className="font-display text-2xl font-extrabold text-brand-700">1985</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="eyebrow">About Sombetini</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Rooted in Arusha, focused on every child’s future</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {history}
          </p>

          <Tabs defaultValue="values" className="mt-8">
            <TabsList className="h-auto flex-wrap justify-start bg-secondary">
              <TabsTrigger value="values" className="gap-1.5"><Heart className="h-3.5 w-3.5" /> Values</TabsTrigger>
              <TabsTrigger value="philosophy" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> Philosophy</TabsTrigger>
              <TabsTrigger value="vision" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Vision</TabsTrigger>
              <TabsTrigger value="mission" className="gap-1.5"><Compass className="h-3.5 w-3.5" /> Mission</TabsTrigger>
            </TabsList>
            <TabsContent value="values">
              <ul className="grid gap-3 sm:grid-cols-2">
                {values.map((value) => (
                  <li key={value.name} className="rounded-2xl border border-border bg-card/60 p-3.5">
                    <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">{value.name}</p>
                    {value.description && (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{value.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="philosophy" className="prose-school whitespace-pre-wrap">{philosophy}</TabsContent>
            <TabsContent value="vision" className="prose-school">{vision}</TabsContent>
            <TabsContent value="mission" className="prose-school">{mission}</TabsContent>
          </Tabs>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild><Link href="/about">Read our story <ArrowRight /></Link></Button>
            <Button asChild variant="outline"><Link href="/academics">Academic programme</Link></Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
