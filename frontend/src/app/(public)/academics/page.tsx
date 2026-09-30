import Link from 'next/link';
import { ArrowRight, BookOpen, Calculator, FlaskConical, Globe2, Languages, Laptop, Music, Palette, Scale, Trophy, CalendarDays, FileText, Users } from 'lucide-react';
import { getActiveClasses, getActiveSubjects, getUpcomingExams } from '@/lib/public-data';
import { PageHero, SectionHeading } from '@/components/site/section-heading';
import { SmartImage } from '@/components/site/smart-image';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { featuredPhotos } from '@/lib/featured-photos';
import { formatDate } from '@/lib/utils';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Academics',
  'Classes, subjects, and academic structure at Sombetini Primary School.',
  { path: '/academics' },
);

type ClassItem = { id: string; name: string; level: number; section?: string | null; capacity: number; _count?: { students: number } };

const subjectIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  KIS: Languages, ENG: BookOpen, MATH: Calculator, SCI: FlaskConical, SST: Globe2, CIV: Scale, GEO: Globe2, HIS: BookOpen, PE: Trophy, ART: Palette, MUS: Music, ICT: Laptop,
};

const stages = [
  { title: 'Lower primary · Standard 1–2', text: 'Foundations in reading, writing and numeracy (KKK — Kusoma, Kuandika, Kuhesabu) in Kiswahili, with early English and play-based learning.' },
  { title: 'Middle primary · Standard 3–5', text: 'A full curriculum across languages, mathematics, science, social studies and civics, with growing independence and project work.' },
  { title: 'Upper primary · Standard 6–7', text: 'Preparation for the Primary School Leaving Examination (PSLE) with revision programmes, mock examinations and guidance for secondary school.' },
];

export default async function AcademicsPage() {
  const [classes, subjects, exams] = await Promise.all([
    getActiveClasses(),
    getActiveSubjects(),
    getUpcomingExams(4),
  ]);

  const byLevel = new Map<number, ClassItem[]>();
  (classes || []).forEach((cls) => byLevel.set(cls.level, [...(byLevel.get(cls.level) || []), cls]));
  const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);

  return (
    <>
      <PageHero eyebrow="Academics" title="A complete primary curriculum, taught with care" text="Sombetini follows the Tanzanian national primary curriculum from Standard 1 to Standard 7, with Kiswahili, English, mathematics, science and social studies at the heart of every week.">
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link href="/examinations"><CalendarDays /> Examination calendar</Link></Button>
          <Button asChild variant="outline"><Link href="/resources"><FileText /> Academic documents</Link></Button>
        </div>
      </PageHero>

      {/* Stages */}
      <section className="container-x py-20">
        <SectionHeading eyebrow="Learning journey" title="Three stages, one steady path" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <Accordion type="single" collapsible defaultValue="0" className="surface px-6">
              {stages.map((stage, index) => (
                <AccordionItem key={stage.title} value={String(index)} className="last:border-0">
                  <AccordionTrigger>
                    <span className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{index + 1}</span>{stage.title}</span>
                  </AccordionTrigger>
                  <AccordionContent>{stage.text}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
          <Reveal delay={0.1}>
            <SmartImage {...featuredPhotos[2]} label="Classroom" className="aspect-[16/11] rounded-[2rem] shadow-card" />
          </Reveal>
        </div>
      </section>

      {/* Subjects */}
      <section className="bg-secondary/60 py-20 dark:bg-secondary/20">
        <div className="container-x">
          <SectionHeading eyebrow="Subjects" title="What pupils study" text="Kiswahili, English, mathematics, science, and the wider primary curriculum taught at Sombetini." />
          <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(subjects?.length ? subjects : [{ id: '1', name: 'Kiswahili', code: 'KIS' }, { id: '2', name: 'English', code: 'ENG' }, { id: '3', name: 'Mathematics', code: 'MATH' }, { id: '4', name: 'Science', code: 'SCI' }]).map((subject) => {
              const Icon = subjectIcons[subject.code] || BookOpen;
              return (
                <StaggerItem key={subject.id}>
                  <div className="surface surface-hover flex items-center gap-4 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold">{subject.name}</p>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{subject.code}</p>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Classes */}
      <section className="container-x py-20">
        <SectionHeading eyebrow="Classes" title="Standard 1 to Standard 7" text="Every standard from early primary through Standard 7, with streams that fit the school’s enrolment." />
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(levels.length ? levels : [1, 2, 3, 4, 5, 6, 7]).map((level) => {
            const streams = byLevel.get(level) || [];
            const pupils = streams.reduce((sum, cls) => sum + (cls._count?.students || 0), 0);
            return (
              <StaggerItem key={level}>
                <article className="surface surface-hover h-full p-6">
                  <div className="flex items-start justify-between">
                    <span className="font-display text-5xl font-extrabold text-brand-600/20">{level}</span>
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold">Standard {level}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{streams.length ? `${streams.length} stream${streams.length > 1 ? 's' : ''} · ${streams.map((s) => s.section).filter(Boolean).join(', ')}` : 'Class streams'}</p>
                  {pupils > 0 && <p className="mt-3 text-xs font-semibold text-brand-700">{pupils} pupils enrolled</p>}
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* Upcoming exams */}
      {exams?.data?.length ? (
        <section className="container-x pb-20">
          <Reveal className="dark-band overflow-hidden rounded-[2.5rem] p-8 text-white sm:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow text-gold-300">Assessment</p>
                <h2 className="mt-3 font-display text-3xl font-bold">Upcoming examinations</h2>
              </div>
              <Button asChild variant="inverse"><Link href="/examinations">Full examination calendar <ArrowRight /></Link></Button>
            </div>
            <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {exams.data.map((exam) => (
                <li key={exam.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-300">{exam.type.replaceAll('_', ' ')}</p>
                  <p className="mt-2 font-display text-lg font-bold leading-snug">{exam.name}</p>
                  <p className="mt-2 text-sm text-white/65">{exam.class?.name || 'All classes'} · {formatDate(exam.startDate, { day: 'numeric', month: 'short' })} – {formatDate(exam.endDate, { day: 'numeric', month: 'short' })}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      ) : null}
    </>
  );
}
