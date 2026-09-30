'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, uploadFile } from '@/lib/api';
import { useProfile } from '@/components/portal-frame';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { formatMoney, humanize } from '@/lib/utils';
import { SCHOOL_ADDRESS, SCHOOL_CORE_VALUE_NAMES, SCHOOL_MAP_EMBED_URL, SCHOOL_MOTTO, SCHOOL_PHILOSOPHY } from '@/lib/school-identity';

type Option = { id: string; name: string };
type Year = Option & { isCurrent?: boolean };
type ClassRow = Option & { level: number };
type Subject = Option & { code: string };
type ParentRow = { id: string; user: { id: string; firstName: string; lastName: string; email: string; emailVerified?: boolean } };
type TeacherRow = { id: string; staffNo: string; user: { firstName: string; lastName: string } };
type PaymentRow = {
  id: string;
  controlNumber?: string | null;
  amount: string;
  status: string;
  transactionRef?: string | null;
  feeItem?: { name: string };
  student?: { firstName: string; lastName: string; registrationNo: string };
};
type Profile = {
  motto?: string | null;
  vision?: string | null;
  mission?: string | null;
  coreValues?: string | null;
  academicPhilosophy?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  mapEmbedUrl?: string | null;
};
type ClaimRow = {
  parentId: string;
  studentId: string;
  relationship: string;
  createdAt: string;
  parent: { user: { firstName: string; lastName: string; email: string; phone?: string | null } };
  student: {
    firstName: string;
    lastName: string;
    registrationNo: string;
    status: string;
    dateOfBirth?: string;
    class?: { name: string } | null;
  };
};

function Panel({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="surface p-5">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminOffice() {
  const { profile } = useProfile();
  const canDeleteParents = profile?.roles.some((role) => role.name === 'SUPER_ADMIN' || role.name === 'SCHOOL_ADMIN') ?? false;
  const [notice, setNotice] = useState('');
  const [parentQuery, setParentQuery] = useState('');
  const [removingParentId, setRemovingParentId] = useState<string | null>(null);
  const [years, setYears] = useState<Year[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [parentAccounts, setParentAccounts] = useState<ParentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [receipts, setReceipts] = useState<Record<string, string>>({});

  async function reload() {
    const [yearRows, classRows, subjectRows, parentPage, teacherPage, paymentRows, schoolProfile, pendingClaims] = await Promise.all([
      api<Year[]>('/academic/years'),
      api<ClassRow[]>('/classes'),
      api<Subject[]>('/subjects'),
      api<{ data: ParentRow[] }>('/parents?limit=50'),
      api<{ data: TeacherRow[] }>('/teachers?limit=50'),
      api<{ data: PaymentRow[] }>('/payments/records?limit=50'),
      api<Profile>('/settings'),
      api<ClaimRow[]>('/parents/claims/pending'),
    ]);
    setYears(yearRows);
    setClasses(classRows);
    setSubjects(subjectRows);
    setParents(parentPage.data);
    setParentAccounts(parentPage.data);
    setTeachers(teacherPage.data);
    setPayments(paymentRows.data);
    setProfile(schoolProfile);
    setClaims(pendingClaims);
  }

  useEffect(() => {
    reload().catch((error) => setNotice(error.message));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>, path: string, body: Record<string, unknown>) {
    event.preventDefault();
    setNotice('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body) });
      event.currentTarget.reset();
      await reload();
      setNotice('Saved.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save.');
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {notice && <p className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm" role="status">{notice}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Academic year" text="Create the year before classes, fees, or examinations.">
          <form className="grid gap-3" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submit(event, '/academic/years', {
              name: form.get('name'),
              startDate: form.get('startDate'),
              endDate: form.get('endDate'),
              isCurrent: true,
            });
          }}>
            <Input name="name" required placeholder="Year name" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="startDate" type="date" required aria-label="Start date" />
              <Input name="endDate" type="date" required aria-label="End date" />
            </div>
            <Button type="submit" className="w-fit">Save year</Button>
          </form>
        </Panel>

        <Panel title="Term" text="Attach a term to a year you already saved.">
          <form className="grid gap-3" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submit(event, '/academic/terms', {
              academicYearId: form.get('academicYearId'),
              name: form.get('name'),
              termNumber: Number(form.get('termNumber')),
              startDate: form.get('startDate'),
              endDate: form.get('endDate'),
              isCurrent: true,
            });
          }}>
            <Select name="academicYearId" required>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</Select>
            <div className="grid grid-cols-2 gap-3">
              <Input name="name" required placeholder="Term name" />
              <Input name="termNumber" type="number" min={1} required placeholder="Term number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input name="startDate" type="date" required aria-label="Term start" />
              <Input name="endDate" type="date" required aria-label="Term end" />
            </div>
            <Button type="submit" className="w-fit">Save term</Button>
          </form>
        </Panel>

        <Panel title="Class" text="Example format is up to the school. Nothing is pre-filled.">
          <form className="grid gap-3" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submit(event, '/classes', { name: form.get('name'), level: Number(form.get('level')), section: form.get('section') || undefined });
          }}>
            <Input name="name" required placeholder="Class name" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="level" type="number" min={1} required placeholder="Level" />
              <Input name="section" placeholder="Section" />
            </div>
            <Button type="submit" className="w-fit">Save class</Button>
          </form>
        </Panel>

        <Panel title="Subject" text="Set the code and the maximum mark the teachers may enter.">
          <form className="grid gap-3" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submit(event, '/subjects', { name: form.get('name'), code: form.get('code'), maxMarks: Number(form.get('maxMarks') || 100) });
          }}>
            <Input name="name" required placeholder="Subject name" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="code" required placeholder="Code" />
              <Input name="maxMarks" type="number" min={1} defaultValue={100} aria-label="Maximum marks" />
            </div>
            <Button type="submit" className="w-fit">Save subject</Button>
          </form>
        </Panel>

        <Panel title="Pending child claims" text="Parents register online and claim their children. Approve only after you confirm the pupil belongs to that family.">
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending claims.</p>
          ) : (
            <ul className="space-y-4">
              {claims.map((claim) => (
                <li key={`${claim.parentId}-${claim.studentId}`} className="rounded-2xl border border-border p-4">
                  <p className="font-medium">
                    {claim.student.firstName} {claim.student.lastName} · {claim.student.registrationNo}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Class {claim.student.class?.name || '—'} · claimed by {claim.parent.user.firstName} {claim.parent.user.lastName} ({claim.parent.user.email})
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        setNotice('');
                        try {
                          await api(`/parents/claims/${claim.parentId}/${claim.studentId}/approve`, { method: 'PUT' });
                          await reload();
                          setNotice('Claim approved. The parent can see this child in their portal.');
                        } catch (error) {
                          setNotice(error instanceof Error ? error.message : 'Could not approve.');
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setNotice('');
                        try {
                          await api(`/parents/claims/${claim.parentId}/${claim.studentId}/reject`, {
                            method: 'PUT',
                            body: JSON.stringify({ reason: 'Not confirmed by the school office' }),
                          });
                          await reload();
                          setNotice('Claim rejected.');
                        } catch (error) {
                          setNotice(error instanceof Error ? error.message : 'Could not reject.');
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {parents.some((parent) => parent.user.emailVerified === false) && (
          <Panel title="Confirm parent email" text="Parents who registered themselves cannot sign in until the office confirms their email (or they open the email link when SMTP is connected).">
            <form
              className="grid gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const userId = String(form.get('userId') || '');
                setNotice('');
                try {
                  await api(`/users/${userId}/verify-email`, { method: 'PUT' });
                  await reload();
                  setNotice('Parent email confirmed. They can sign in now.');
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : 'Could not confirm the email.');
                }
              }}
            >
              <Select name="userId" required>
                {parents.filter((parent) => parent.user.emailVerified === false).map((parent) => (
                  <option key={parent.user.id} value={parent.user.id}>
                    {parent.user.firstName} {parent.user.lastName} · {parent.user.email}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="outline" className="w-fit">Confirm parent email</Button>
            </form>
          </Panel>
        )}

        {canDeleteParents && (
          <Panel title="Parent accounts" text="Delete a parent login when the family should no longer use the portal. Their children stay on the school list. An account with fee records cannot be deleted.">
            <form
              className="flex gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const query = parentQuery.trim();
                setNotice('');
                try {
                  const page = await api<{ data: ParentRow[] }>(`/parents?limit=50${query ? `&search=${encodeURIComponent(query)}` : ''}`);
                  setParentAccounts(page.data);
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : 'Could not search parent accounts.');
                }
              }}
            >
              <Input value={parentQuery} onChange={(event) => setParentQuery(event.target.value)} placeholder="Search by name or email" aria-label="Search parent accounts" />
              <Button type="submit" variant="outline">Search</Button>
            </form>
            {parentAccounts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No parent accounts match that search.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {parentAccounts.map((parent) => (
                  <li key={parent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                    <div>
                      <p className="font-medium">{parent.user.firstName} {parent.user.lastName}</p>
                      <p className="text-sm text-muted-foreground">{parent.user.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={removingParentId === parent.user.id}
                      onClick={async () => {
                        const name = `${parent.user.firstName} ${parent.user.lastName}`;
                        if (!window.confirm(`Delete ${name}'s parent account? They will not be able to sign in. Their children stay on the school list.`)) return;
                        setRemovingParentId(parent.user.id);
                        setNotice('');
                        try {
                          await api(`/users/${parent.user.id}`, { method: 'DELETE' });
                          setParents((current) => current.filter((row) => row.user.id !== parent.user.id));
                          setParentAccounts((current) => current.filter((row) => row.user.id !== parent.user.id));
                          setClaims((current) => current.filter((claim) => claim.parent.user.email !== parent.user.email));
                          setNotice(`${name}'s account has been deleted. They can register again with the same email if the family still needs access.`);
                        } catch (error) {
                          setNotice(error instanceof Error ? error.message : 'Could not delete the parent account.');
                        } finally {
                          setRemovingParentId(null);
                        }
                      }}
                    >
                      {removingParentId === parent.user.id ? 'Deleting…' : 'Delete account'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel title="Teacher account" text="Then assign the class and subject they will mark.">
          <form className="grid gap-3" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submit(event, '/users/accounts', {
              kind: 'TEACHER',
              firstName: form.get('firstName'),
              lastName: form.get('lastName'),
              email: form.get('email'),
              password: form.get('password'),
              staffNo: form.get('staffNo'),
            });
          }}>
            <Input name="staffNo" required placeholder="Staff number" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="firstName" required placeholder="First name" />
              <Input name="lastName" required placeholder="Last name" />
            </div>
            <Input name="email" type="email" required placeholder="Email" />
            <Input name="password" type="password" minLength={10} required placeholder="Temporary password (10+ chars, mixed case + number)" />
            <Button type="submit" className="w-fit">Create teacher</Button>
          </form>
          <form className="mt-4 grid gap-3 border-t border-border pt-4" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            const teacherId = String(form.get('teacherId'));
            return submit(event, `/teachers/${teacherId}/assignments`, { classId: form.get('classId'), subjectId: form.get('subjectId') });
          }}>
            <Select name="teacherId" required>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.user.firstName} {teacher.user.lastName} · {teacher.staffNo}</option>)}</Select>
            <Select name="classId" required>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Select name="subjectId" required>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Button type="submit" variant="outline" className="w-fit">Assign class and subject</Button>
          </form>
        </Panel>

        <Panel title="Examination" text="Teachers can enter marks only after an examination exists.">
          <form className="grid gap-3" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submit(event, '/examinations', {
              name: form.get('name'),
              type: form.get('type'),
              academicYearId: form.get('academicYearId'),
              termId: form.get('termId'),
              classId: form.get('classId') || undefined,
              startDate: form.get('startDate'),
              endDate: form.get('endDate'),
              maxMarks: 100,
            });
          }}>
            <Input name="name" required placeholder="Examination name" />
            <Select name="type" required>
              <option value="MID_TERM">Mid term</option>
              <option value="END_TERM">End of term</option>
              <option value="ANNUAL">Annual</option>
            </Select>
            <TermSelect years={years} />
            <Select name="classId"><option value="">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <div className="grid grid-cols-2 gap-3">
              <Input name="startDate" type="date" required aria-label="Exam start" />
              <Input name="endDate" type="date" required aria-label="Exam end" />
            </div>
            <Button type="submit" className="w-fit">Save examination</Button>
          </form>
        </Panel>

        <Panel title="School charge" text="Parents generate a control number from these charges. Nothing is marked paid by itself.">
          <form className="grid gap-3" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submit(event, '/payments/fee-items', {
              name: form.get('name'),
              category: form.get('category'),
              amount: Number(form.get('amount')),
              academicYearId: form.get('academicYearId'),
              classId: form.get('classId') || undefined,
              dueDate: form.get('dueDate') || undefined,
            });
          }}>
            <Input name="name" required placeholder="Charge name" />
            <Select name="category" required>
              {['SCHOOL_FEES', 'EXAMINATION_FEES', 'UNIFORM', 'TRANSPORT', 'MEALS', 'ACTIVITIES', 'OTHER'].map((item) => <option key={item} value={item}>{humanize(item)}</option>)}
            </Select>
            <Input name="amount" type="number" min={1} required placeholder="Amount in TZS" />
            <Select name="academicYearId" required>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</Select>
            <Select name="classId"><option value="">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Input name="dueDate" type="date" aria-label="Due date" />
            <Button type="submit" className="w-fit">Save charge</Button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Publish report cards" text="After marks are approved, this ranks the class for the term, publishes the cards, renders the PDFs in the background, and notifies linked parents.">
          <form className="grid gap-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setNotice('');
            try {
              const result = await api<{ published: number; parentsNotified: number }>('/results/publish', {
                method: 'POST',
                body: JSON.stringify({
                  termId: form.get('termId'),
                  classId: form.get('classId'),
                  headComment: form.get('headComment') || undefined,
                }),
              });
              setNotice(`Published ${result.published} report card${result.published === 1 ? '' : 's'}. ${result.parentsNotified} parent account${result.parentsNotified === 1 ? '' : 's'} notified.`);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : 'Could not publish report cards.');
            }
          }}>
            <TermSelect years={years} />
            <Select name="classId" required>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Textarea name="headComment" placeholder="Head of school comment (optional, printed on every card)" />
            <Button type="submit" className="w-fit">Publish report cards</Button>
          </form>
        </Panel>

        <Panel title="Notice to all parents" text="Saved in every parent's portal at once. Email and SMS copies go out in the background when those accounts are connected.">
          <form className="grid gap-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const target = event.currentTarget;
            setNotice('');
            try {
              const result = await api<{ message: string; recipients: number }>('/notifications/broadcast', {
                method: 'POST',
                body: JSON.stringify({
                  roles: [String(form.get('roles') || 'PARENT')],
                  type: form.get('type'),
                  title: form.get('title'),
                  message: form.get('message'),
                }),
              });
              target.reset();
              setNotice(`${result.message} Recipients: ${result.recipients}.`);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : 'Could not send the notice.');
            }
          }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="roles" required>
                <option value="PARENT">All parents</option>
                <option value="TEACHER">All teachers</option>
              </Select>
              <Select name="type" required>
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="PAYMENT_REMINDER">Fee reminder</option>
                <option value="EXAMINATION">Examination</option>
                <option value="EVENT">Event</option>
                <option value="SYSTEM">System</option>
              </Select>
            </div>
            <Input name="title" required placeholder="Title" maxLength={120} />
            <Textarea name="message" required placeholder="Message" maxLength={600} />
            <Button type="submit" className="w-fit">Send notice</Button>
          </form>
        </Panel>
      </div>

      <section className="surface p-5">
        <h3 className="font-display text-xl font-semibold">Payment desk</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">A control number is not a payment. Record paid only after you have a real bank or mobile-money receipt reference.</p>
        <ul className="mt-4 space-y-3">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{payment.student?.firstName} {payment.student?.lastName} · {payment.feeItem?.name}</p>
                <p className="text-sm text-muted-foreground">{payment.controlNumber || 'No control number'} · {formatMoney(payment.amount)} · {humanize(payment.status)}</p>
              </div>
              {payment.status !== 'PAID' && (
                <form className="flex gap-2" onSubmit={async (event) => {
                  event.preventDefault();
                  setNotice('');
                  try {
                    await api(`/payments/${payment.id}/confirm`, { method: 'POST', body: JSON.stringify({ transactionRef: receipts[payment.id] || '' }) });
                    await reload();
                    setNotice('Receipt recorded. The parent will see this charge as paid.');
                  } catch (error) {
                    setNotice(error instanceof Error ? error.message : 'Could not record the receipt.');
                  }
                }}>
                  <Input aria-label="Receipt reference" value={receipts[payment.id] || ''} onChange={(e) => setReceipts({ ...receipts, [payment.id]: e.target.value })} placeholder="Receipt reference" />
                  <Button type="submit">Mark paid</Button>
                </form>
              )}
            </li>
          ))}
          {!payments.length && <li className="text-sm text-muted-foreground">No payment requests yet.</li>}
        </ul>
      </section>

      <Panel title="School profile" text="This is what the public site shows. Motto, core values, and philosophy appear on the home and About pages.">
        <form className="grid gap-3" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setNotice('');
          try {
            await api('/settings', {
              method: 'PUT',
              body: JSON.stringify({
                motto: form.get('motto'),
                vision: form.get('vision'),
                mission: form.get('mission'),
                coreValues: form.get('coreValues'),
                academicPhilosophy: form.get('academicPhilosophy'),
                phone: form.get('phone'),
                email: form.get('email'),
                address: form.get('address'),
                mapEmbedUrl: form.get('mapEmbedUrl'),
              }),
            });
            setNotice('School profile saved.');
          } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Could not save the profile.');
          }
        }}>
          <Input name="motto" key={`motto-${profile?.motto || ''}`} defaultValue={profile?.motto || SCHOOL_MOTTO} placeholder="Motto" />
          <Textarea name="coreValues" key={`values-${profile?.coreValues || ''}`} defaultValue={profile?.coreValues || SCHOOL_CORE_VALUE_NAMES} placeholder="Core values (comma-separated names)" />
          <Textarea name="academicPhilosophy" key={`phil-${profile?.academicPhilosophy || ''}`} defaultValue={profile?.academicPhilosophy || SCHOOL_PHILOSOPHY} rows={8} placeholder="Educational philosophy" />
          <Textarea name="vision" key={`vision-${profile?.vision || ''}`} defaultValue={profile?.vision || ''} placeholder="Vision" />
          <Textarea name="mission" key={`mission-${profile?.mission || ''}`} defaultValue={profile?.mission || ''} placeholder="Mission" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="phone" key={`phone-${profile?.phone || ''}`} defaultValue={profile?.phone || ''} placeholder="Phone" />
            <Input name="email" type="email" key={`email-${profile?.email || ''}`} defaultValue={profile?.email || ''} placeholder="Email" />
          </div>
          <Input name="address" key={`address-${profile?.address || ''}`} defaultValue={profile?.address || SCHOOL_ADDRESS} placeholder="Address" />
          <Input name="mapEmbedUrl" key={`map-${profile?.mapEmbedUrl || ''}`} defaultValue={profile?.mapEmbedUrl || SCHOOL_MAP_EMBED_URL} placeholder="Google Maps embed URL" />
          <Button type="submit" className="w-fit">Save profile</Button>
        </form>
      </Panel>

      <Panel title="Upload a document" text="PDF, Word, Excel, JPG, PNG, or WebP. The file is stored on the school server; publish it so parents can download it from Resources.">
        <form className="grid gap-3" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const file = (data.get('file') as File | null);
          if (!file || file.size === 0) {
            setNotice('Choose a file first.');
            return;
          }
          setNotice('');
          try {
            const uploaded = await uploadFile(file);
            await api('/documents', {
              method: 'POST',
              body: JSON.stringify({
                title: String(data.get('title') || file.name),
                category: data.get('category') || 'OTHER',
                description: data.get('description') || undefined,
                fileName: uploaded.fileName,
                fileUrl: uploaded.fileUrl,
                fileSize: uploaded.fileSize,
                mimeType: uploaded.mimeType,
                isPublished: data.get('publish') === 'on',
              }),
            });
            form.reset();
            setNotice(`Saved ${uploaded.fileName}. Parents see it under Resources once it is published.`);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Could not upload the file.');
          }
        }}>
          <Input name="title" required placeholder="Document title" />
          <Select name="category" required>
            {['CALENDAR', 'EXAM_TIMETABLE', 'SCHOOL_RULES', 'PARENT_GUIDELINES', 'FEE_STRUCTURE', 'ADMISSION', 'ACADEMIC', 'FORMS', 'NOTICES', 'OTHER'].map((item) => (
              <option key={item} value={item}>{humanize(item)}</option>
            ))}
          </Select>
          <Textarea name="description" placeholder="Short description (optional)" />
          <Input name="file" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="publish" defaultChecked className="rounded border-border" />
            Publish immediately on the public Resources page
          </label>
          <Button type="submit" className="w-fit">Upload document</Button>
        </form>
      </Panel>
    </div>
  );
}

/**
 * Year and term chosen together so a form can never submit a term from a different year
 * (the database rejects that pairing; this keeps the office from ever seeing that error).
 */
function TermSelect({ years, yearField = 'academicYearId' }: { years: Year[]; yearField?: string }) {
  const [terms, setTerms] = useState<Option[]>([]);
  const [yearId, setYearId] = useState(years.find((year) => year.isCurrent)?.id || years[0]?.id || '');
  const [termId, setTermId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!yearId && years[0]) setYearId(years.find((year) => year.isCurrent)?.id || years[0].id);
  }, [years, yearId]);

  useEffect(() => {
    if (!yearId) return;
    setLoading(true);
    setTermId('');
    api<Option[]>(`/academic/terms?academicYearId=${yearId}`)
      .then((list) => {
        setTerms(list);
        setTermId(list[0]?.id || '');
      })
      .catch(() => {
        setTerms([]);
        setTermId('');
      })
      .finally(() => setLoading(false));
  }, [yearId]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select name={yearField} value={yearId} onChange={(event) => setYearId(event.target.value)} aria-label="Academic year" required>
        {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
      </Select>
      <Select name="termId" value={termId} onChange={(event) => setTermId(event.target.value)} aria-label="Term" required disabled={loading || terms.length === 0}>
        {terms.length === 0 && <option value="">{loading ? 'Loading terms…' : 'No terms in this year yet'}</option>}
        {terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
      </Select>
    </div>
  );
}
