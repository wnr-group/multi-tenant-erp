export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-skeleton animate-pulse" />
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-16 rounded bg-skeleton animate-pulse" />
              <div className="h-9 w-full rounded bg-skeleton animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
    </div>
  );
}
