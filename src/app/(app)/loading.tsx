// Shown instantly on navigation between app tabs while the server renders.
// Next prefetches this boundary, so tapping a tab paints immediately instead
// of waiting on the auth + data round-trips.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-surface-soft" />
      <div className="mt-3 h-4 w-56 animate-pulse rounded-lg bg-surface-soft" />
      <div className="mt-8 flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[68px] animate-pulse rounded-[1.25rem] bg-surface-soft"
          />
        ))}
      </div>
    </main>
  );
}
