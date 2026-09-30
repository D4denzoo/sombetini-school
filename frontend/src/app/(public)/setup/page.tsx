'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export default function SetupPage() {
  const router = useRouter();
  const [open, setOpen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ open: boolean }>('/auth/setup-status')
      .then((status) => setOpen(status.open))
      .catch(() => setOpen(false));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirm = String(form.get('confirm') || '');
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          schoolName: 'Sombetini Primary School',
          adminFirstName: String(form.get('firstName') || '').trim(),
          adminLastName: String(form.get('lastName') || '').trim(),
          adminEmail: String(form.get('email') || '').trim(),
          adminPassword: password,
        }),
      });
      router.push('/login?portal=admin&created=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The administrator account could not be created.');
      setBusy(false);
    }
  }

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft"><ShieldCheck className="h-6 w-6" /></span>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">Create the administrator</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use the head teacher’s own email and a password of at least 10 characters with uppercase, lowercase, and a number. This account opens the administration office for school settings, teachers, and child-claim approvals.
        </p>

        {open === null && <p className="mt-8 text-sm text-muted-foreground">Checking whether setup is still open…</p>}

        {open === false && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm leading-6">
            <p>An administrator already exists. Sign in with that email to open the school office.</p>
            <Button asChild className="mt-4"><Link href="/login?portal=admin">Go to sign in <ArrowRight /></Link></Button>
          </div>
        )}

        {open && (
          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" htmlFor="firstName"><Input id="firstName" name="firstName" required autoComplete="given-name" className="h-12" /></Field>
              <Field label="Last name" htmlFor="lastName"><Input id="lastName" name="lastName" required autoComplete="family-name" className="h-12" /></Field>
            </div>
            <Field label="Email address" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" placeholder="name@school.ac.tz" className="h-12" /></Field>
            <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="h-12" /></Field>
            <Field label="Confirm password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="h-12" /></Field>
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
            <Button type="submit" size="xl" disabled={busy} className="w-full">
              {busy ? <Loader2 className="animate-spin" /> : null} Create administrator account {!busy && <ArrowRight />}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
