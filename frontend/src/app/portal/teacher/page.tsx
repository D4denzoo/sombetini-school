'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PortalFrame, useProfile } from '@/components/portal-frame';
import { api } from '@/lib/api';
import type { Announcement, Paged } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { humanize } from '@/lib/utils';

type Assignment = { id: string; class: { id: string; name: string }; subject: { id: string; name: string } };
type Student = { id: string; firstName: string; lastName: string; registrationNo: string };
type Exam = { id: string; name: string; academicYearId: string; termId: string };
type Pending = { id: string; marks: number | null; status: string; student: { firstName: string; lastName: string }; subject: { name: string } };

const links = [
  { href: '/portal/teacher', label: 'Dashboard' },
  { href: '/portal/teacher#marks', label: 'Enter marks' },
  { href: '/resources', label: 'Teaching resources' },
  { href: '/news', label: 'Announcements' },
];

export default function TeacherPortalPage() {
  const { profile, error } = useProfile();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending[]>([]);
  const [news, setNews] = useState<Announcement[]>([]);
  const [notice, setNotice] = useState('');

  const assignment = assignments.find((item) => item.id === assignmentId) || assignments[0];
  const missing = students.filter((student) => marks[student.id] === undefined || marks[student.id] === '').length;

  useEffect(() => {
    api<Assignment[]>('/teachers/me/assignments').then((data) => {
      setAssignments(data);
      if (data[0]) setAssignmentId(data[0].id);
    }).catch((err) => setNotice(err.message));
    api<Pending[]>('/results/pending').then(setPending).catch(() => undefined);
    api<Paged<Announcement>>('/announcements?limit=4').then((data) => setNews(data.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!assignment) return;
    api<{ data: Student[] }>(`/students?classId=${assignment.class.id}&limit=60`).then((data) => setStudents(data.data)).catch(() => undefined);
    api<{ data: Exam[] }>(`/examinations?classId=${assignment.class.id}&limit=20`).then((data) => {
      setExams(data.data);
      if (data.data[0]) setExamId(data.data[0].id);
    }).catch(() => undefined);
  }, [assignment]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!assignment) return;
    const exam = exams.find((item) => item.id === examId);
    if (!exam) return;
    setNotice('');
    try {
      for (const student of students) {
        const value = marks[student.id];
        if (value === undefined || value === '') continue;
        await api('/results/marks', {
          method: 'POST',
          body: JSON.stringify({
            studentId: student.id,
            subjectId: assignment.subject.id,
            examinationId: exam.id,
            academicYearId: exam.academicYearId,
            termId: exam.termId,
            marks: Number(value),
          }),
        });
      }
      await api('/results/submit', { method: 'POST', body: JSON.stringify({ examinationId: exam.id, classId: assignment.class.id }) });
      setNotice('Marks were saved and submitted for approval. Approved marks cannot be edited from this screen.');
      setPending(await api<Pending[]>('/results/pending'));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Marks could not be saved.');
    }
  }

  return (
    <PortalFrame title="Teaching desk" kicker={profile?.teacher ? `Staff ${profile.teacher.staffNo}` : 'Teacher'} links={links}>
      {error && <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="surface p-5"><p className="text-sm text-muted-foreground">Classes</p><p className="mt-2 font-display text-4xl font-semibold">{new Set(assignments.map((item) => item.class.id)).size}</p></article>
        <article className="surface p-5"><p className="text-sm text-muted-foreground">Subjects</p><p className="mt-2 font-display text-4xl font-semibold">{new Set(assignments.map((item) => item.subject.id)).size}</p></article>
        <article className="surface p-5"><p className="text-sm text-muted-foreground">Awaiting action</p><p className="mt-2 font-display text-4xl font-semibold">{pending.length}</p></article>
      </div>

      <section id="marks" className="surface mt-8 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">Marks entry</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Enter and submit</h2>
            <p className="mt-2 text-sm text-muted-foreground">Marks must be 0–100. Empty cells stay as missing. Submission sends drafts for academic approval.</p>
          </div>
          {missing > 0 && <Badge variant="warning">{missing} missing</Badge>}
        </div>

        <form onSubmit={save} className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={assignment?.id || ''} onChange={(e) => setAssignmentId(e.target.value)}>
              {assignments.map((item) => <option key={item.id} value={item.id}>{item.class.name} · {item.subject.name}</option>)}
            </Select>
            <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
            </Select>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/80 text-muted-foreground"><tr><th className="px-4 py-3">Pupil</th><th>Registration</th><th className="pr-4">Marks</th></tr></thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{student.firstName} {student.lastName}</td>
                    <td className="text-muted-foreground">{student.registrationNo}</td>
                    <td className="pr-4 py-2">
                      <Input inputMode="decimal" aria-label={`Marks for ${student.firstName}`} value={marks[student.id] || ''} onChange={(e) => setMarks({ ...marks, [student.id]: e.target.value })} className="h-10 w-24" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-3 md:hidden">
            {students.map((student) => (
              <li key={student.id} className="rounded-2xl border border-border p-4">
                <p className="font-medium">{student.firstName} {student.lastName}</p>
                <p className="text-xs text-muted-foreground">{student.registrationNo}</p>
                <Input inputMode="decimal" aria-label={`Marks for ${student.firstName}`} value={marks[student.id] || ''} onChange={(e) => setMarks({ ...marks, [student.id]: e.target.value })} className="mt-3" placeholder="Marks" />
              </li>
            ))}
          </ul>

          <Button type="submit" size="lg">Save and submit for approval</Button>
        </form>
        {notice && <p className="mt-4 text-sm" role="status">{notice}</p>}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="surface p-6">
          <h2 className="font-display text-xl font-semibold">Pending submissions</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {pending.slice(0, 8).map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-border/70 py-2">
                <span>{item.student.firstName} {item.student.lastName} · {item.subject.name}</span>
                <Badge variant="outline">{humanize(item.status)}</Badge>
              </li>
            ))}
            {!pending.length && <li className="text-muted-foreground">Nothing waiting.</li>}
          </ul>
        </article>
        <article className="surface p-6">
          <h2 className="font-display text-xl font-semibold">School announcements</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {news.map((item) => <li key={item.id} className="border-b border-border/70 pb-3">{item.title}</li>)}
          </ul>
        </article>
      </section>
    </PortalFrame>
  );
}
