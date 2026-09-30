import Link from 'next/link';
import { ArrowRight, Download, LockKeyhole, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { ResultCheck } from '@/components/result-check';
import { PageHero } from '@/components/site/section-heading';
import { Button } from '@/components/ui/button';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Results',
  'Verify an official report reference number from Sombetini Primary School.',
  { path: '/results' },
);

const steps = [
  { n: '1', title: 'Ingia kwenye Parent Portal', text: 'Sign in with the email and password issued by the school.' },
  { n: '2', title: 'Chagua jina la mtoto', text: 'Switch between children on the same account.' },
  { n: '3', title: 'Bonyeza “Matokeo”', text: 'Pick the term to see subject marks, grades, average and comments.' },
  { n: '4', title: 'Pakua report card', text: 'Download or print the official PDF report card.' },
];

export default function ResultsPage() {
  return (
    <>
      <PageHero eyebrow="Student results" title="Results are private. Verification is public." text="Full report cards are visible only to the parent or guardian linked to a pupil. Anyone holding a printed report can confirm that it is genuine using its reference number.">
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href="/login?portal=parent">Open Parent Portal <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="#verify">Verify a report</Link></Button>
        </div>
      </PageHero>

      <section className="container-x grid gap-12 py-16 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="eyebrow">For parents</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">How to see your child’s results</h2>
          <ol className="mt-8 space-y-4">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 font-display font-bold text-white">{step.n}</span>
                <div>
                  <p className="font-display font-bold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Stagger className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: TrendingUp, text: 'Subject marks, grades and trends' },
              { icon: Download, text: 'Printable PDF report card' },
              { icon: Users, text: 'All your children, one login' },
            ].map((item) => (
              <StaggerItem key={item.text}>
                <div className="flex items-center gap-3 rounded-2xl border border-border p-4 text-sm">
                  <item.icon className="h-5 w-5 shrink-0 text-brand-600" /> {item.text}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>

        <Reveal delay={0.1} id="verify">
          <p className="eyebrow">Public verification</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">Confirm a report card is genuine</h2>
          <p className="mt-3 text-muted-foreground">Employers, secondary schools and guardians can validate a report without seeing private marks.</p>
          <div className="mt-6"><ResultCheck /></div>
          <ul className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex gap-2"><LockKeyhole className="h-4 w-4 shrink-0 text-brand-600" /> Marks stay inside the Parent Portal.</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" /> Every lookup is checked and logged on the server.</li>
          </ul>
        </Reveal>
      </section>
    </>
  );
}
