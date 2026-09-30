import Link from 'next/link';
import { ArrowRight, MessageSquareText, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Smartphone, title: 'Built for phones', text: 'Results, fees and notices are readable on any smartphone, even on slow connections.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'A parent sees only their own children. Every access is checked on the server and logged.' },
  { icon: MessageSquareText, title: 'Msaidizi wa Sombetini', text: 'Ask in Swahili or English and get step-by-step guidance for the portal.' },
];

export function AssistantCta() {
  return (
    <section className="container-x pb-8">
      <Reveal className="relative overflow-hidden rounded-[2.5rem] border border-border bg-gradient-to-br from-brand-50 via-background to-gold-50 p-8 shadow-soft dark:from-brand-950 dark:via-background dark:to-gold-700/10 sm:p-12">
        <div className="dot-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(60%_80%_at_100%_0%,black,transparent)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">A school platform, not just a website</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Stay close to your child’s learning, wherever you are</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Sombetini’s digital platform brings report cards, payment control numbers, examination dates and official notices into one secure place for families and staff.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/login?portal=parent">Sign in to Parent Portal <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/contact">Request an account</Link></Button>
            </div>
          </div>
          <ul className="grid gap-4">
            {features.map((item) => (
              <li key={item.title} className="flex gap-4 rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white"><item.icon className="h-5 w-5" /></span>
                <div>
                  <p className="font-display text-base font-bold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Sparkles className="absolute right-8 top-8 h-6 w-6 text-gold-400" />
      </Reveal>
    </section>
  );
}
