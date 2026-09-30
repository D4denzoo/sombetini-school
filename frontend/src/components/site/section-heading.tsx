import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/motion';

export function SectionHeading({
  eyebrow,
  title,
  text,
  action,
  align = 'left',
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: { href: string; label: string };
  align?: 'left' | 'center';
  light?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', align === 'center' && 'items-center text-center md:flex-col md:items-center', className)}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className={cn('eyebrow', light && 'text-gold-300')}>{eyebrow}</p>}
        <h2 className={cn('mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl', light ? 'text-white' : 'text-foreground')}>{title}</h2>
        {text && <p className={cn('mt-3 text-base leading-7', light ? 'text-white/70' : 'text-muted-foreground')}>{text}</p>}
      </div>
      {action && (
        <Link href={action.href} className={cn('group inline-flex items-center gap-1.5 text-sm font-semibold', light ? 'text-gold-300' : 'text-brand-700 hover:text-brand-800')}>
          {action.label}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </Reveal>
  );
}

export function PageHero({ eyebrow, title, text, children, className }: { eyebrow?: string; title: string; text?: string; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('hero-mesh relative overflow-hidden border-b border-border/60', className)}>
      <div className="dot-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]" />
      <div className="container-x relative py-14 sm:py-20">
        <Reveal>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.75rem]">{title}</h1>
          {text && <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{text}</p>}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
