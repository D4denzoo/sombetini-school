import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
        gold: 'border-transparent bg-gold-100 text-gold-700 dark:bg-gold-700/30 dark:text-gold-300',
        outline: 'border-border text-foreground',
        inverse: 'border-white/20 bg-white/10 text-white',
        success: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        danger: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        info: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
        neutral: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const categoryVariant: Record<string, BadgeProps['variant']> = {
  EMERGENCY: 'danger',
  EXAMINATION: 'info',
  HOLIDAY: 'gold',
  PARENT_MEETING: 'default',
  ACADEMIC: 'success',
  SPORTS: 'warning',
  SPORTS_DAY: 'warning',
  CULTURAL: 'gold',
  GRADUATION: 'gold',
  COMPETITION: 'info',
  GENERAL: 'neutral',
};

export function categoryBadge(category?: string | null): BadgeProps['variant'] {
  return (category && categoryVariant[category]) || 'neutral';
}

export { Badge, badgeVariants };
