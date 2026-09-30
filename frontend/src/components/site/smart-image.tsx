'use client';

import { useState } from 'react';
import { BookOpen, Camera, GraduationCap, Sparkles, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publicAssetUrl } from '@/lib/api';

type Tone = 'forest' | 'gold' | 'sky' | 'clay';
type Motif = 'campus' | 'students' | 'sports' | 'classroom' | 'graduation' | 'generic';

const tones: Record<Tone, string> = {
  forest: 'from-brand-600 via-brand-700 to-brand-900',
  gold: 'from-gold-400 via-gold-500 to-brand-700',
  sky: 'from-sky-400 via-brand-500 to-brand-800',
  clay: 'from-orange-300 via-rose-400 to-brand-800',
};

const motifs: Record<Motif, React.ComponentType<{ className?: string }>> = {
  campus: Camera,
  students: Users,
  sports: Trophy,
  classroom: BookOpen,
  graduation: GraduationCap,
  generic: Sparkles,
};

/**
 * Renders a photo when the file exists, otherwise a designed brand placeholder.
 */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  tone = 'forest',
  motif = 'generic',
  label,
  priority,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  tone?: Tone;
  motif?: Motif;
  label?: string;
  priority?: boolean;
}) {
  const resolved = publicAssetUrl(src) || undefined;
  const [failed, setFailed] = useState(!resolved);
  const Icon = motifs[motif];

  if (failed) {
    return (
      <div role="img" aria-label={alt} className={cn('relative overflow-hidden bg-gradient-to-br', tones[tone], className)}>
        <div className="dot-grid absolute inset-0 opacity-40 mix-blend-soft-light" />
        <svg aria-hidden className="absolute -right-10 -top-10 h-56 w-56 text-white/10" viewBox="0 0 200 200" fill="currentColor">
          <circle cx="100" cy="100" r="100" />
        </svg>
        <svg aria-hidden className="absolute -bottom-16 -left-8 h-64 w-64 text-white/10" viewBox="0 0 200 200" fill="currentColor">
          <path d="M100 0c40 30 60 70 60 100s-20 70-60 100C60 170 40 130 40 100S60 30 100 0z" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-start justify-end p-5 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon className="h-5 w-5" />
          </span>
          {label && <p className="mt-3 font-display text-lg font-semibold leading-tight drop-shadow">{label}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        src={resolved}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </div>
  );
}
