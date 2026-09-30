import { CalendarRange, Filter } from 'lucide-react';
import { publicGet } from '@/lib/api';
import { getActiveClasses, getAcademicYears } from '@/lib/public-data';
import type { Paged } from '@/lib/types';
import { PageHero } from '@/components/site/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/skeleton';
import { Reveal } from '@/components/motion';
import { daysUntil, formatDate, humanize } from '@/lib/utils';

type Exam = { id: string; name: string; type: string; startDate: string; endDate: string; maxMarks: number; description?: string | null; class?: { name: string } | null; term?: { name: string } | null; academicYear?: { name: string } | null };

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Examination calendar',
  'Upcoming examinations and timetables at Sombetini Primary School.',
  { path: '/examinations' },
);

export default async function ExaminationsPage({ searchParams }: { searchParams: Promise<{ classId?: string; type?: string; termId?: string; academicYearId?: string }> }) {
  const query = await searchParams;
  const params = new URLSearchParams({ limit: '60' });
  for (const key of ['classId', 'type', 'termId', 'academicYearId'] as const) if (query[key]) params.set(key, query[key]!);

  const [exams, classes, years] = await Promise.all([
    publicGet<Paged<Exam>>(`/examinations?${params.toString()}`),
    getActiveClasses(),
    getAcademicYears(),
  ]);
  const items = (exams?.data || []).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const terms = (years || []).flatMap((year) => (year.terms || []).map((term) => ({ ...term, year: year.name })));

  return (
    <>
      <PageHero eyebrow="Examinations" title="Examination calendar" text="Filter by class, examination type, term and academic year. Marks and grades are only available inside the Parent Portal." />

      <section className="container-x py-12">
        <Reveal>
          <form method="get" className="surface grid gap-4 p-6 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
            <Field label="Class" htmlFor="classId">
              <Select id="classId" name="classId" defaultValue={query.classId || ''}>
                <option value="">All classes</option>
                {(classes || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Type" htmlFor="type">
              <Select id="type" name="type" defaultValue={query.type || ''}>
                <option value="">All types</option>
                <option value="MID_TERM">Mid-term</option>
                <option value="END_TERM">End of term</option>
                <option value="FINAL">Final</option>
                <option value="ANNUAL">Annual</option>
                <option value="MOCK">Mock</option>
              </Select>
            </Field>
            <Field label="Term" htmlFor="termId">
              <Select id="termId" name="termId" defaultValue={query.termId || ''}>
                <option value="">All terms</option>
                {terms.map((term) => <option key={term.id} value={term.id}>{term.name} · {term.year}</option>)}
              </Select>
            </Field>
            <Field label="Academic year" htmlFor="academicYearId">
              <Select id="academicYearId" name="academicYearId" defaultValue={query.academicYearId || ''}>
                <option value="">All years</option>
                {(years || []).map((year) => <option key={year.id} value={year.id}>{year.name}{year.isCurrent ? ' (current)' : ''}</option>)}
              </Select>
            </Field>
            <Button type="submit"><Filter /> Filter</Button>
          </form>
        </Reveal>

        {items.length ? (
          <div className="mt-8 overflow-hidden rounded-3xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Examination</th>
                  <th className="hidden px-5 py-3 md:table-cell">Class</th>
                  <th className="hidden px-5 py-3 md:table-cell">Type</th>
                  <th className="px-5 py-3">Dates</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Term</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {items.map((exam) => {
                  const inDays = daysUntil(exam.startDate);
                  const ended = daysUntil(exam.endDate);
                  const status = ended !== null && ended < 0 ? { label: 'Completed', variant: 'neutral' as const } : inDays !== null && inDays <= 0 ? { label: 'In progress', variant: 'success' as const } : { label: inDays !== null ? `In ${inDays} days` : 'Scheduled', variant: 'info' as const };
                  return (
                    <tr key={exam.id} className="transition hover:bg-secondary/50">
                      <td className="px-5 py-4">
                        <p className="font-display font-bold">{exam.name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{exam.class?.name || 'All classes'} · {humanize(exam.type)}</p>
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">{exam.class?.name || 'All classes'}</td>
                      <td className="hidden px-5 py-4 md:table-cell"><Badge variant="outline">{humanize(exam.type)}</Badge></td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5"><CalendarRange className="h-4 w-4 text-brand-600" /> {formatDate(exam.startDate, { day: 'numeric', month: 'short' })} – {formatDate(exam.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </td>
                      <td className="hidden px-5 py-4 text-muted-foreground lg:table-cell">{exam.term?.name}{exam.academicYear ? ` · ${exam.academicYear.name}` : ''}</td>
                      <td className="px-5 py-4 text-right"><Badge variant={status.variant}>{status.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-8"><EmptyState icon={CalendarRange} title="No examinations match these filters" text="Try widening the filters, or check back closer to the examination period." /></div>
        )}
      </section>
    </>
  );
}
