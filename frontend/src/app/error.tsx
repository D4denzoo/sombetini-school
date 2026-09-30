'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error', error.digest || error.name);
  }, [error]);

  return (
    <main id="main" className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">We could not load this page</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Try again in a moment. If the problem continues, contact the school office during working hours.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" size="lg" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
