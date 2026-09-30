import { cn, initials } from '@/lib/utils';

export function Avatar({ name, src, className, size = 'md' }: { name: string; src?: string | null; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base', xl: 'h-24 w-24 text-2xl' };
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display font-semibold text-white', sizes[size], className)}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}
