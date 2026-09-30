import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/site/section-heading';
import { Button } from '@/components/ui/button';

const steps = [
  { n: '01', title: 'Create account or sign in', text: 'On your phone, open Parent Portal and create an account with your own email and password. One account can hold several children.' },
  { n: '02', title: 'Claim your children', text: 'Add each pupil with their school registration number. The office confirms the link, then results and fees appear for that child.' },
  { n: '03', title: 'Read results', text: 'Approved term marks, grades and comments appear here. Download a PDF report card when it is published.' },
  { n: '04', title: 'Pay school fees', text: 'Pick a charge, generate a control number, then pay at a bank or mobile money agent. The portal never pretends a payment is complete.' },
];

export function Journey() {
  return (
    <section className="border-y border-border/70 bg-card py-20">
      <div className="container-x">
        <SectionHeading
          eyebrow="For parents"
          title="Four steps. No guesswork."
          text="Most families use the platform from a phone. These are the only moves you need."
        />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="relative rounded-[1.75rem] border border-border bg-background p-6">
              <span className="font-display text-4xl font-semibold text-gold-500">{step.n}</span>
              <h3 className="mt-4 font-display text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link href="/login?portal=parent">Go to Parent Portal <ArrowRight /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
