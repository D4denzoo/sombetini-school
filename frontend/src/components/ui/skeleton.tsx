import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-xl', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-brand-600">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
