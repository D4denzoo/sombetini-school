'use client';

import { FormEvent, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Loader2, Search, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

type Verification = {
  verified: boolean;
  term: string;
  academicYear: string;
  issuedAt?: string;
};

export function ResultCheck() {
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      setResult(await api<Verification>(`/results/verify/${encodeURIComponent(reference.trim())}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matokeo hayapatikani.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface p-6 sm:p-8">
      <form onSubmit={onSubmit}>
        <Label htmlFor="reference">Result reference number</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} required placeholder="e.g. SPS-2026-T1-00123" className="h-12 flex-1 font-mono tracking-wide" />
          <Button type="submit" size="lg" disabled={busy} className="sm:w-40">{busy ? <Loader2 className="animate-spin" /> : <Search />} Verify</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">The reference is printed on every report card. This check confirms a report was issued by the school; it does not reveal a pupil’s name, marks, or position.</p>
      </form>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </motion.div>
        )}
        {result && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center gap-3 bg-emerald-50 px-5 py-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <BadgeCheck className="h-5 w-5" />
              <p className="font-display font-bold">Verified — this report card was issued by Sombetini Primary School</p>
            </div>
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              {[
                ['Term', result.term],
                ['Academic year', result.academicYear],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
