export default function PublicLoading() {
  return (
    <div className="min-h-[60vh]" aria-busy="true" aria-live="polite">
      <div className="border-b border-border/60 bg-secondary/40">
        <div className="container-x py-16 sm:py-20">
          <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
          <div className="mt-5 h-10 w-2/3 max-w-xl animate-pulse rounded-2xl bg-muted" />
          <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded-full bg-muted/80" />
          <div className="mt-2 h-4 w-4/5 max-w-md animate-pulse rounded-full bg-muted/70" />
        </div>
      </div>
      <div className="container-x grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[1.5rem] bg-muted/70" />
        ))}
      </div>
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
