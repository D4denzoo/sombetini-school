import { cn } from '@/lib/utils';
import { publicAssetUrl } from '@/lib/api';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-brand-800 text-white shadow-soft ring-1 ring-gold-400/60', className)} aria-hidden>
      <svg viewBox="0 0 48 48" className="h-8 w-8">
        <path d="M8 34c8-14 12-22 16-26 4 4 8 12 16 26" fill="none" stroke="#E8C36A" strokeWidth="2.2" />
        <path d="M24 8 10 18h28L24 8z" fill="#F4E7C3" />
        <path d="M14 18v12c0 5 4.5 8 10 8s10-3 10-8V18" fill="#1F6A4A" />
        <path d="M24 20v16" stroke="#E8C36A" strokeWidth="1.6" />
      </svg>
    </span>
  );
}

export function Logo({ light = false, compact = false, name = 'Sombetini', subtitle = 'Primary School', logoUrl }: { light?: boolean; compact?: boolean; name?: string; subtitle?: string; logoUrl?: string | null }) {
  const src = publicAssetUrl(logoUrl);
  return (
    <span className="flex items-center gap-3">
      {src ? <img src={src} alt="" className="h-11 w-11 rounded-2xl object-cover" /> : <LogoMark />}
      {!compact && (
        <span className="leading-none">
          <span className={cn('block font-display text-[19px] font-semibold tracking-tight', light ? 'text-white' : 'text-foreground')}>{name}</span>
          <span className={cn('mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.22em]', light ? 'text-gold-300' : 'text-brand-700')}>{subtitle}</span>
        </span>
      )}
    </span>
  );
}
