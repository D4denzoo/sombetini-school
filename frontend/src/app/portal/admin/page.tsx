'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PortalFrame, useProfile } from '@/components/portal-frame';
import { api } from '@/lib/api';
import type { Paged, Stats } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminOffice } from '@/components/admin/office';
import { formatMoney } from '@/lib/utils';

type Student = { id: string; firstName: string; lastName: string; registrationNo: string; status: string; class?: { name: string } };
type Health = {
  status?: string;
  checks?: {
    database?: { status?: string };
    redis?: { status?: string };
    queue?: { status?: string };
    email?: { status?: string };
    sms?: { status?: string };
    payments?: { status?: string };
  };
  [key: string]: unknown;
};

const links = [
  { href: '/portal/admin', label: 'Overview' },
  { href: '/portal/admin#students', label: 'Students' },
  { href: '/portal/admin#announce', label: 'Announcements' },
  { href: '/portal/admin#health', label: 'System health' },
];

export default function AdminPortalPage() {
  const { error } = useProfile();
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<{ total: number; paid: number; pending: number; outstandingAmount?: string | null } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState<Health | null>(null);
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  async function loadStudents(query = '') {
    const data = await api<Paged<Student>>(`/students?limit=12${query ? `&search=${encodeURIComponent(query)}` : ''}`);
    setStudents(data.data);
  }

  useEffect(() => {
    api<Stats>('/settings/stats').then(setStats).catch(() => undefined);
    api<typeof payments>('/payments/stats').then(setPayments).catch(() => undefined);
    api<Health>('/health/details').then(setHealth).catch(() => undefined);
    api<Paged<unknown>>('/audit-logs?limit=1').then((data) => setAuditCount(data.meta.total)).catch(() => undefined);
    loadStudents().catch((err) => setNotice(err.message));
  }, []);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice('');
    try {
      const created = await api<{ id: string }>('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          category: form.get('category'),
        }),
      });
      await api(`/announcements/${created.id}/publish`, { method: 'PUT' });
      setNotice('Announcement published to the public site.');
      event.currentTarget.reset();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not publish.');
    }
  }

  const cards = [
    ['Students', stats?.studentCount],
    ['Teachers', stats?.teacherCount],
    ['Parents', stats?.parentCount],
    ['Classes', stats?.classCount],
    ['Payments', payments?.total],
    ['Paid', payments?.paid],
    ['Outstanding', payments?.outstandingAmount ? formatMoney(payments.outstandingAmount) : '—'],
    ['Audit events', auditCount],
  ];

  return (
    <PortalFrame title="School operations" kicker="Administration" links={links}>
      {error && <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value], index) => (
          <article key={String(label)} className={index === 0 ? 'surface bg-brand-900 p-5 text-white' : 'surface p-5'}>
            <p className={`text-sm ${index === 0 ? 'text-gold-300' : 'text-muted-foreground'}`}>{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{value ?? '—'}</p>
          </article>
        ))}
      </div>

      <section id="students" className="surface mt-8 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">Enrolment</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Find a pupil</h2>
          </div>
          <form className="flex w-full max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); loadStudents(search).catch((err) => setNotice(err.message)); }}>
            <label className="sr-only" htmlFor="student-search">Search students</label>
            <Input id="student-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or registration number" />
            <Button type="submit">Search</Button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/70 text-muted-foreground"><tr><th className="px-6 py-3">Registration</th><th>Name</th><th>Class</th><th>Status</th></tr></thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t border-border">
                  <td className="px-6 py-3 font-mono text-xs">{student.registrationNo}</td>
                  <td className="font-medium">{student.firstName} {student.lastName}</td>
                  <td>{student.class?.name}</td>
                  <td><Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'}>{student.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminOffice />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section id="announce" className="surface p-6">
          <h2 className="font-display text-2xl font-semibold">Publish a notice</h2>
          <p className="mt-2 text-sm text-muted-foreground">This appears on the public news page as soon as you publish.</p>
          <form onSubmit={publish} className="mt-5 grid gap-3">
            <Input name="title" required placeholder="Title" />
            <Select name="category">
              {['GENERAL', 'EXAMINATION', 'HOLIDAY', 'PARENT_MEETING', 'ACADEMIC', 'EMERGENCY'].map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Textarea name="description" required rows={5} placeholder="Write the notice in language families can understand." />
            <Button type="submit" className="w-fit">Publish now</Button>
          </form>
          {notice && <p className="mt-3 text-sm" role="status">{notice}</p>}
        </section>

        <section id="health" className="surface p-6">
          <h2 className="font-display text-2xl font-semibold">System health</h2>
          <ul className="mt-5 space-y-3">
            {[
              ['API', health?.status || 'unknown'],
              ['Database', health?.checks?.database?.status || 'unknown'],
              ['Redis', health?.checks?.redis?.status || 'unknown'],
              ['Queue', health?.checks?.queue?.status || 'unknown'],
              ['Email', health?.checks?.email?.status || 'unknown'],
              ['SMS', health?.checks?.sms?.status || 'unknown'],
              ['Payments', health?.checks?.payments?.status || 'unknown'],
            ].map(([label, value]) => {
              const ok = /^(ok|up|configured|live|office-reconciled)$/i.test(String(value));
              return (
                <li key={label} className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
                  <span className="text-sm font-medium">{label}</span>
                  <Badge variant={ok ? 'success' : 'warning'}>{String(value)}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PortalFrame>
  );
}
