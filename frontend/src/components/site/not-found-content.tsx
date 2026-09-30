import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function NotFoundContent() {
  return (
    <div className="container-x flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        The link may be outdated or the page was moved. Try search, or return to the school home page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/search">Search</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/contact">Contact school</Link>
        </Button>
      </div>
    </div>
  );
}
