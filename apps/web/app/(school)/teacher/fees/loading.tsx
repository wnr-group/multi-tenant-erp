export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-skeleton animate-pulse" />
      <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
    </div>
  );
}
