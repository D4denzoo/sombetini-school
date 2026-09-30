'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    try {
      await api('/settings/contact', {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name'), email: form.get('email'), phone: form.get('phone'), subject: form.get('subject'), message: form.get('message') }),
      });
      setSent(true);
      formEl.reset();
      toast.success('Ujumbe umetumwa. The school office will reply soon.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Message could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="surface grid place-items-center p-10 text-center" role="status">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></span>
        <p className="mt-4 font-display text-xl font-bold">Asante — message received</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">The school office has your message and will reply by phone or email during working hours.</p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>Send another message</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface grid gap-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name"><Input id="name" name="name" required autoComplete="name" /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+255 7xx xxx xxx" /></Field>
      </div>
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Subject" htmlFor="subject">
        <Select id="subject" name="subject" defaultValue="Admission enquiry">
          {['Admission enquiry', 'Parent Portal account', 'Fees and payments', 'Results and report cards', 'Meeting with a teacher', 'Other'].map((item) => <option key={item}>{item}</option>)}
        </Select>
      </Field>
      <Field label="Message" htmlFor="message"><Textarea id="message" name="message" required rows={5} placeholder="Andika ujumbe wako…" /></Field>
      <Button type="submit" size="lg" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Send message</Button>
      <p className="text-xs text-muted-foreground">We use your details only to reply to this message. See the <a href="/privacy" className="underline">privacy policy</a> and <a href="/terms" className="underline">terms of use</a>.</p>
    </form>
  );
}
