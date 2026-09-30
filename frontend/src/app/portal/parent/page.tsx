'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Bell, CalendarDays, CreditCard, Download, GraduationCap } from 'lucide-react';
import { PortalFrame, useProfile } from '@/components/portal-frame';
import { api, apiBlob } from '@/lib/api';
import type { PublicSettings } from '@/lib/types';
import type { Announcement, Paged, SchoolEvent } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { cn, formatDate, formatMoney, humanize } from '@/lib/utils';

type Mark = { id: string; marks: number | null; grade: string | null; remarks?: string | null; subject: { name: string } };
type ResultsPayload = { marks: Mark[]; reportCards: { id: string; averageScore?: number | null; position?: number | null; referenceNo: string; term: { name: string } }[] };
type Fee = { id: string; name: string; amount: string; category: string };
type Payment = { id: string; controlNumber?: string | null; amount: string; status: string; deadline?: string | null; instructions?: string | null; feeItem: { name: string } };
type ClassOption = { id: string; name: string; level: number };

const links = [
  { href: '/portal/parent', label: 'Overview' },
  { href: '/portal/parent#children', label: 'Children' },
  { href: '/portal/parent#results', label: 'Results' },
  { href: '/portal/parent#payments', label: 'Payments' },
  { href: '/news', label: 'Announcements' },
];

function gradeClass(grade?: string | null) {
  const g = (grade || '').toUpperCase();
  if (g.startsWith('A')) return 'grade-a';
  if (g.startsWith('B')) return 'grade-b';
  if (g.startsWith('C')) return 'grade-c';
  if (g.startsWith('D')) return 'grade-d';
  if (g) return 'grade-f';
  return 'bg-muted text-muted-foreground';
}

export default function ParentPortalPage() {
  const { profile, error, reloadProfile } = useProfile();
  const [childId, setChildId] = useState('');
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [news, setNews] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [notice, setNotice] = useState('');
  const [feeItemId, setFeeItemId] = useState('');
  const [paymentsLive, setPaymentsLive] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [claimBusy, setClaimBusy] = useState(false);

  const approved = profile?.parent?.children || [];
  const pending = profile?.parent?.pendingChildren || [];
  const child = approved.find((item) => item.id === childId) || approved[0];

  useEffect(() => {
    if (child && !approved.some((item) => item.id === childId)) setChildId(child.id);
    if (!child) setChildId('');
  }, [child, childId, approved]);

  useEffect(() => {
    api<Paged<Announcement>>('/announcements?limit=4').then((data) => setNews(data.data)).catch(() => undefined);
    api<Paged<SchoolEvent>>('/events?limit=4').then((data) => setEvents(data.data)).catch(() => undefined);
    api<PublicSettings>('/settings/public').then((data) => {
      setPaymentsLive(data?.platform?.paymentsMode === 'live');
    }).catch(() => undefined);
    api<ClassOption[]>('/classes?isActive=true').then(setClasses).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!child) {
      setResults(null);
      setFees([]);
      setPayments([]);
      return;
    }
    api<ResultsPayload>(`/results/student/${child.id}`).then(setResults).catch((err) => setNotice(err.message));
    api<Fee[]>(`/payments/fee-items?classId=${child.classId}`).then((items) => {
      setFees(items);
      if (items[0]) setFeeItemId(items[0].id);
    }).catch(() => undefined);
    api<Payment[]>(`/payments?studentId=${child.id}`).then(setPayments).catch(() => undefined);
  }, [child]);

  async function claimChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice('');
    setClaimBusy(true);
    try {
      await api('/parents/me/children/claims', {
        method: 'POST',
        body: JSON.stringify({
          registrationNo: form.get('registrationNo'),
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          gender: form.get('gender'),
          dateOfBirth: form.get('dateOfBirth'),
          classId: form.get('classId'),
          relationship: form.get('relationship') || 'parent',
        }),
      });
      event.currentTarget.reset();
      await reloadProfile();
      setNotice('Claim submitted. The school office must confirm before you can see results and fees for this child.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not submit the claim.');
    } finally {
      setClaimBusy(false);
    }
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!child) return;
    setNotice('');
    try {
      const payment = await api<Payment>('/control-numbers', {
        method: 'POST',
        body: JSON.stringify({ feeItemId, studentId: child.id }),
      });
      setPayments((current) => [payment, ...current.filter((item) => item.id !== payment.id)]);
      setNotice(`Control number ${payment.controlNumber} is ready. Payment is not marked paid until a gateway confirms it.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not create a control number.');
    }
  }

  async function downloadCard() {
    if (!child) return;
    let blob: Blob;
    try {
      blob = await apiBlob(`/results/report-card/${child.id}`);
    } catch {
      setNotice('The report card is not available yet.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${child.registrationNo}-report.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const childSwitcher = approved.length > 0 ? (
    <label className="hidden min-w-[12rem] text-xs font-medium text-muted-foreground sm:block">
      Child
      <Select value={child?.id || ''} onChange={(e) => setChildId(e.target.value)} className="mt-1 h-10">
        {approved.map((item) => (
          <option key={item.id} value={item.id}>{item.name} — {item.class}</option>
        ))}
      </Select>
    </label>
  ) : null;

  const outstanding = payments.filter((p) => p.status !== 'PAID').length;
  const latestAverage = results?.reportCards?.[0]?.averageScore;

  return (
    <PortalFrame title={child ? child.name : 'Parent portal'} kicker="Family account" links={links} toolbar={childSwitcher}>
      {error && <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {approved.length > 0 && (
        <label className="mb-5 block text-xs font-medium text-muted-foreground sm:hidden">
          Child
          <Select value={child?.id || ''} onChange={(e) => setChildId(e.target.value)} className="mt-1">
            {approved.map((item) => (
              <option key={item.id} value={item.id}>{item.name} — {item.class}</option>
            ))}
          </Select>
        </label>
      )}

      {child && (
        <p className="mb-6 text-sm text-muted-foreground">
          {child.registrationNo} · {child.class} · switch children any time without signing out.
        </p>
      )}

      {!child && (
        <p className="mb-6 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
          No confirmed children yet. Add a child below. Results and fees appear after the school office approves your claim.
        </p>
      )}

      <section id="children" className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="surface p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">Enrolment</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Add a child</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the pupil’s school registration number. The office must confirm before this child appears for results and fees.
          </p>
          <form onSubmit={claimChild} className="mt-5 grid gap-3">
            <Field label="Registration number" htmlFor="registrationNo">
              <Input id="registrationNo" name="registrationNo" required className="h-11" placeholder="e.g. SPS-2026-00123" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" htmlFor="firstName"><Input id="firstName" name="firstName" required className="h-11" /></Field>
              <Field label="Last name" htmlFor="lastName"><Input id="lastName" name="lastName" required className="h-11" /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Gender" htmlFor="gender">
                <Select id="gender" name="gender" required className="h-11">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </Select>
              </Field>
              <Field label="Date of birth" htmlFor="dateOfBirth">
                <Input id="dateOfBirth" name="dateOfBirth" type="date" required className="h-11" />
              </Field>
            </div>
            <Field label="Class" htmlFor="classId">
              <Select id="classId" name="classId" required className="h-11">
                <option value="">Select class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Your relationship" htmlFor="relationship">
              <Select id="relationship" name="relationship" className="h-11" defaultValue="parent">
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
              </Select>
            </Field>
            <Button type="submit" disabled={claimBusy} className="w-fit">{claimBusy ? 'Submitting…' : 'Submit claim'}</Button>
          </form>
        </div>

        <div className="surface p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">Waiting</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Pending confirmation</h2>
          <ul className="mt-5 space-y-3">
            {pending.map((item) => (
              <li key={item.id} className="rounded-2xl bg-secondary/70 px-4 py-3">
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.registrationNo} · {item.class} · waiting for school office</p>
              </li>
            ))}
            {!pending.length && (
              <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No pending claims.
              </li>
            )}
          </ul>
          {approved.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Confirmed children</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {approved.map((item) => (
                  <li key={item.id}>{item.name} · {item.registrationNo} · {item.class}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {child && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Latest average', value: latestAverage != null ? `${latestAverage}` : '—', icon: GraduationCap },
            { label: 'Open payments', value: outstanding, icon: CreditCard },
            { label: 'School notices', value: news.length, icon: Bell },
          ].map((item) => (
            <article key={item.label} className="surface p-5">
              <item.icon className="h-5 w-5 text-brand-700" />
              <p className="mt-4 font-display text-3xl font-semibold">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
            </article>
          ))}
        </div>
      )}

      {notice && <p className="mt-4 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm" role="status">{notice}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section id="results" className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">Academic</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Recent results</h2>
            </div>
            {(results?.reportCards?.length || 0) > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={downloadCard}><Download /> PDF</Button>
            )}
          </div>
          <ul className="mt-5 space-y-2">
            {(results?.marks || []).slice(0, 8).map((mark) => (
              <li key={mark.id} className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
                <span className="text-sm font-medium">{mark.subject.name}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-sm text-muted-foreground">{mark.marks ?? '—'}</span>
                  <span className={cn('grid h-8 w-8 place-items-center rounded-full text-xs font-bold', gradeClass(mark.grade))}>{mark.grade || '—'}</span>
                </span>
              </li>
            ))}
            {!child && <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Results appear after the office confirms a child.</li>}
            {child && !results?.marks?.length && <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No approved results for this child yet.</li>}
          </ul>
        </section>

        <section className="surface p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">School life</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Notices & dates</h2>
          <ul className="mt-5 space-y-3">
            {news.map((item) => (
              <li key={item.id} className="border-b border-border/70 pb-3 last:border-0">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.publishedAt ? formatDate(item.publishedAt, { day: 'numeric', month: 'short' }) : 'Notice'}</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-gold-600" /> Coming up</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {events.map((item) => <li key={item.id}>{formatDate(item.startDate, { day: 'numeric', month: 'short' })} · {item.title}</li>)}
          </ul>
        </section>
      </div>

      <section id="payments" className="mt-6 overflow-hidden rounded-[1.75rem] bg-brand-950 text-white">
        <div className="khanga h-1.5" />
        <div className="p-6 sm:p-8">
          {!paymentsLive && (
            <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm leading-6 text-amber-50" role="status">
              <p className="font-semibold text-white">Office-reconciled payments (not live GePG yet)</p>
              <p className="mt-1 text-white/85">
                Control numbers help the school track what you owe. Pay only using instructions from the school office. This app will not mark fees as paid until a live gateway is connected or the office confirms your receipt.
              </p>
            </div>
          )}
          <h2 className="font-display text-2xl font-semibold">Fee control number</h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            {!child
              ? 'Available after the school office confirms at least one child on your account.'
              : paymentsLive
                ? 'Generate a number, then pay through the channel shown. Paid status updates when the gateway confirms.'
                : 'Generate a number for office records, then pay as directed by the school. This screen will not mark a payment as paid until a real gateway confirms it or the office records your receipt.'}
          </p>
          {child && (
            <>
              <form onSubmit={generate} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <select value={feeItemId} onChange={(e) => setFeeItemId(e.target.value)} className="h-12 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white">
                  {fees.map((fee) => <option key={fee.id} value={fee.id} className="text-foreground">{fee.name} · {formatMoney(fee.amount)}</option>)}
                </select>
                <Button type="submit" variant="gold" size="lg">Generate number</Button>
              </form>
              <ul className="mt-6 grid gap-4 lg:grid-cols-2">
                {payments.map((payment) => (
                  <li key={payment.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{payment.feeItem?.name || 'Charge'}</p>
                      <Badge variant="inverse">{humanize(payment.status)}</Badge>
                    </div>
                    <p className="mt-3 font-display text-3xl tracking-wide">{payment.controlNumber || 'Pending'}</p>
                    <p className="mt-1 text-sm text-white/70">{formatMoney(payment.amount)}</p>
                    {payment.instructions && <pre className="mt-3 whitespace-pre-wrap text-xs text-white/60">{payment.instructions}</pre>}
                  </li>
                ))}
                {!payments.length && <li className="text-sm text-white/60">No control numbers yet for this child.</li>}
              </ul>
            </>
          )}
        </div>
      </section>
    </PortalFrame>
  );
}
