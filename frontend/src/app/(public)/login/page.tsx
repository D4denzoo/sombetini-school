'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiRequestError } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Logo } from '@/components/site/logo';
import { SmartImage } from '@/components/site/smart-image';
import { featuredPhotos } from '@/lib/featured-photos';
import { cn } from '@/lib/utils';

const portalCopy = {
  parent: { title: 'Parent Portal', text: 'Results, report cards, fees and school notices for every child on your account.', icon: Users },
  teacher: { title: 'Teacher Portal', text: 'Your classes, marks entry, approvals and teaching resources.', icon: BookOpen },
  admin: { title: 'Administration', text: 'Manage students, staff, results, payments and content.', icon: ShieldCheck },
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const portalKey = (params.get('portal') || 'parent') as keyof typeof portalCopy;
  const portal = portalCopy[portalKey] || portalCopy.parent;
  const [mode, setMode] = useState<'sign-in' | 'create' | 'forgot' | 'reset'>('sign-in');
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [tempToken, setTempToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const created = params.get('created') === '1';
  const expired = params.get('expired') === '1';
  const resetToken = params.get('reset') || '';
  const verifyToken = params.get('verify') || '';
  const verifying = useRef(false);

  useEffect(() => {
    if (resetToken) {
      setMode('reset');
    } else {
      setMode('sign-in');
    }
    setStep('password');
    setError('');
    setNotice(expired ? 'Your session ended. Sign in again to continue.' : '');
  }, [portalKey, resetToken, expired]);

  useEffect(() => {
    if (!verifyToken || verifying.current) return;
    verifying.current = true;
    api<{ message: string }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: verifyToken }) })
      .then((result) => {
        setNotice(result.message);
        setError('');
        router.replace(`/login?portal=${portalKey}`);
      })
      .catch((err) => {
        // Strict Mode remounts can race a successful first call; keep a success notice if present.
        setError((current) => current || (err instanceof Error ? err.message : 'Could not confirm the email.'));
      });
  }, [verifyToken, portalKey, router]);

  async function resendConfirmation() {
    if (!pendingEmail) return;
    setBusy(true);
    try {
      const result = await api<{ message: string }>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: pendingEmail }) });
      setNotice(result.message);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the confirmation email.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    api<{ open: boolean }>('/auth/setup-status').then((status) => setSetupOpen(status.open)).catch(() => setSetupOpen(false));
  }, []);

  function destination(profile: Profile) {
    const roles = profile.roles.map((role) => role.name);
    if (roles.some((role) => ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACADEMIC_ADMIN', 'SYSTEM_AUDITOR'].includes(role))) return '/portal/admin';
    if (roles.includes('TEACHER')) return '/portal/teacher';
    return '/portal/parent';
  }

  async function finishSignIn() {
    const profile = await api<Profile>('/auth/profile');
    localStorage.setItem('profile', JSON.stringify(profile));
    toast.success(`Karibu, ${profile.firstName}!`);
    router.push(destination(profile));
  }

  async function onCreateAccount(event: FormEvent<HTMLFormElement>) {
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
      const created = await api<{ message: string; verificationRequired?: boolean }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          email: form.get('email'),
          phone: form.get('phone') || undefined,
          password,
          acceptTerms: form.get('acceptTerms') === 'on',
        }),
      });
      setPendingEmail(String(form.get('email') || ''));
      setNotice(created.message);
      setMode('sign-in');
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
      setBusy(false);
    }
  }

  async function onForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      const result = await api<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email') }),
      });
      setNotice(result.message);
      setMode('sign-in');
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
      setBusy(false);
    }
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
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
      const result = await api<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword: password }),
      });
      setNotice(result.message);
      setMode('sign-in');
      router.replace(`/login?portal=${portalKey}`);
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.');
      setBusy(false);
    }
  }

  async function onSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      if (step === 'otp') {
        await api('/auth/verify-2fa', {
          method: 'POST',
          body: JSON.stringify({ code: form.get('code'), tempToken }),
        });
        await finishSignIn();
        return;
      }

      const result = await api<{ authenticated?: boolean; requires2FA?: boolean; tempToken?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (result.requires2FA && result.tempToken) {
        setTempToken(result.tempToken);
        setStep('otp');
        setBusy(false);
        return;
      }
      await finishSignIn();
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(String(form.get('email') || ''));
      }
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }

  const creating = portalKey === 'parent' && mode === 'create';
  const forgetting = mode === 'forgot';
  const resetting = mode === 'reset';

  return (
    <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-[1fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <SmartImage {...featuredPhotos[0]} className="absolute inset-0 h-full w-full" imgClassName="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-brand-900/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/"><Logo light /></Link>
          <div>
            <p className="eyebrow text-gold-300">Sombetini Digital Platform</p>
            <h2 className="mt-4 max-w-md font-display text-5xl font-semibold leading-[1.05]">Karibu. One sign-in for the whole school family.</h2>
            <ul className="mt-8 grid gap-3 text-sm text-white/80">
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-gold-300" /> Parents create their own account from a phone</li>
              <li className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-gold-300" /> Only linked children appear in the portal</li>
              <li className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-gold-300" /> Argon2id passwords, audit-logged access</li>
            </ul>
          </div>
          <p className="text-xs text-white/50">© {new Date().getFullYear()} Sombetini Primary School</p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
            {(['parent', 'teacher', 'admin'] as const).map((key) => (
              <Link key={key} href={`/login?portal=${key}`} className={cn('rounded-full py-2 text-center text-xs font-semibold transition sm:text-sm', portalKey === key ? 'bg-background shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {portalCopy[key].title.replace(' Portal', '').replace('Administration', 'Admin')}
              </Link>
            ))}
          </div>

          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft"><portal.icon className="h-6 w-6" /></span>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">
            {step === 'otp'
              ? 'Two-factor verification'
              : resetting
                ? 'Choose a new password'
                : forgetting
                  ? 'Reset password'
                  : creating
                    ? 'Create parent account'
                    : portal.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {step === 'otp'
              ? 'Enter the 6-digit code from your authenticator app.'
              : resetting
                ? 'Enter a new password for this account. Use at least 10 characters with uppercase, lowercase, and a number.'
                : forgetting
                  ? 'We will email a reset link to the address on your account. The link works for one hour.'
                  : creating
                    ? 'Create a parent account from your phone. After you sign in, claim each child with their registration number — the school office confirms before results and fees appear.'
                    : portal.text}
          </p>
          {created && <p className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900" role="status">Administrator account created. Sign in with that email and password.</p>}
          {notice && <p className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900" role="status">{notice}</p>}
          {pendingEmail && !resetting && !creating && (
            <p className="mt-3 text-sm text-muted-foreground">
              Did the confirmation email not arrive?{' '}
              <button type="button" onClick={resendConfirmation} disabled={busy} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Send it again</button>
            </p>
          )}
          {setupOpen && portalKey === 'admin' && (
            <p className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-brand-950">
              No administrator exists yet. <Link href="/setup" className="font-semibold underline">Create that account first</Link>.
            </p>
          )}

          {creating ? (
            <form onSubmit={onCreateAccount} className="mt-8 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" htmlFor="firstName"><Input id="firstName" name="firstName" required autoComplete="given-name" className="h-12" /></Field>
                <Field label="Last name" htmlFor="lastName"><Input id="lastName" name="lastName" required autoComplete="family-name" className="h-12" /></Field>
              </div>
              <Field label="Your email" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" className="h-12" /></Field>
              <Field label="Phone (optional)" htmlFor="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+255 …" className="h-12" /></Field>
              <Field label="Choose a password" htmlFor="password" hint="At least 10 characters, with uppercase, lowercase, and a number">
                <div className="relative">
                  <Input id="password" name="password" type={show ? 'text' : 'password'} required minLength={10} autoComplete="new-password" className="h-12 pr-12" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password" htmlFor="confirm"><Input id="confirm" name="confirm" type={show ? 'text' : 'password'} required minLength={10} autoComplete="new-password" className="h-12" /></Field>
              <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input id="acceptTerms" name="acceptTerms" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-border" />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">Terms of Use</Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">Privacy Policy</Link>.
                </span>
              </label>
              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">{error}</p>}
              <Button type="submit" size="xl" disabled={busy} className="w-full">
                {busy ? <Loader2 className="animate-spin" /> : null} Create account {!busy && <ArrowRight />}
              </Button>
            </form>
          ) : forgetting ? (
            <form onSubmit={onForgotPassword} className="mt-8 grid gap-5">
              <Field label="Email address" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" className="h-12" /></Field>
              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">{error}</p>}
              <Button type="submit" size="xl" disabled={busy} className="w-full">
                {busy ? <Loader2 className="animate-spin" /> : null} Email reset link {!busy && <ArrowRight />}
              </Button>
            </form>
          ) : resetting ? (
            <form onSubmit={onResetPassword} className="mt-8 grid gap-5">
              <Field label="New password" htmlFor="password"><Input id="password" name="password" type={show ? 'text' : 'password'} required minLength={10} autoComplete="new-password" className="h-12" /></Field>
              <Field label="Confirm password" htmlFor="confirm"><Input id="confirm" name="confirm" type={show ? 'text' : 'password'} required minLength={10} autoComplete="new-password" className="h-12" /></Field>
              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">{error}</p>}
              <Button type="submit" size="xl" disabled={busy} className="w-full">
                {busy ? <Loader2 className="animate-spin" /> : null} Save new password {!busy && <ArrowRight />}
              </Button>
            </form>
          ) : (
            <form onSubmit={onSignIn} className="mt-8 grid gap-5">
              {step === 'password' ? (
                <>
                  <Field label="Email address" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" placeholder={portalKey === 'parent' ? 'you@gmail.com' : 'you@example.com'} className="h-12" /></Field>
                  <Field label="Password" htmlFor="password">
                    <div className="relative">
                      <Input id="password" name="password" type={show ? 'text' : 'password'} required minLength={8} autoComplete="current-password" className="h-12 pr-12" />
                      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary" aria-label={show ? 'Hide password' : 'Show password'}>
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </>
              ) : (
                <Field label="Authentication code" htmlFor="code"><Input id="code" name="code" required inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" className="h-14 text-center font-mono text-2xl tracking-[0.5em]" autoFocus /></Field>
              )}
              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">{error}</p>}
              <Button type="submit" size="xl" disabled={busy} className="w-full">
                {busy ? <Loader2 className="animate-spin" /> : null} {step === 'otp' ? 'Verify and continue' : 'Sign in'} {!busy && <ArrowRight />}
              </Button>
            </form>
          )}

          <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            {portalKey === 'parent' && step === 'password' && mode === 'sign-in' && (
              <>
                <button type="button" onClick={() => { setMode('create'); setError(''); setNotice(''); }} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  New here? Create your account
                </button>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  Forgot password?
                </button>
              </>
            )}
            {portalKey === 'parent' && (creating || forgetting || resetting) && (
              <button type="button" onClick={() => { setMode('sign-in'); setError(''); router.replace(`/login?portal=${portalKey}`); }} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                Back to sign in
              </button>
            )}
            {portalKey !== 'parent' && mode === 'sign-in' && (
              <>
                <span>Staff accounts are opened by the school office.</span>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  Forgot password?
                </button>
              </>
            )}
            {portalKey !== 'parent' && (forgetting || resetting) && (
              <button type="button" onClick={() => { setMode('sign-in'); setError(''); router.replace(`/login?portal=${portalKey}`); }} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                Back to sign in
              </button>
            )}
            {step === 'otp' && <button type="button" onClick={() => setStep('password')} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Back to password</button>}
          </div>
          {portalKey === 'parent' && (
            <p className="mt-8 text-xs text-muted-foreground">
              After you sign in, the school links your child to this account so results and fees appear. Until then the portal opens, but the children’s list stays empty.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
