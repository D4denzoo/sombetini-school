import { Award, BookOpen, Clock, School, Users } from 'lucide-react';
import { CountUp, Reveal } from '@/components/motion';
import type { Stats } from '@/lib/types';

export function StatsBand({ stats, yearsOfService }: { stats?: Stats | null; yearsOfService?: number }) {
  const items = [
    { label: 'Pupils enrolled', value: stats?.studentCount ?? 0, suffix: '', icon: Users },
    { label: 'Dedicated teachers', value: stats?.teacherCount ?? 0, suffix: '', icon: BookOpen },
    { label: 'Classes', value: stats?.classCount ?? 0, suffix: '', icon: School },
    { label: 'Years of service', value: yearsOfService ?? 0, suffix: '+', icon: Clock },
    { label: 'Parent accounts', value: stats?.parentCount ?? 0, suffix: '', icon: Award },
  ];

  return (
    <section className="dark-band relative overflow-hidden text-white">
      <div className="dot-grid absolute inset-0 opacity-20" />
      <div className="container-x relative py-16">
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-gold-300">The school in numbers</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">A growing community, updated live</h2>
          </div>
          <p className="max-w-md text-sm text-white/65">Enrolment, staffing, and classes — updated as the school year unfolds.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.06} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10">
              <item.icon className="h-5 w-5 text-gold-300" />
              <p className="mt-4 font-display text-4xl font-extrabold tracking-tight">
                <CountUp value={item.value} suffix={item.suffix} />
              </p>
              <p className="mt-1 text-sm text-white/65">{item.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
