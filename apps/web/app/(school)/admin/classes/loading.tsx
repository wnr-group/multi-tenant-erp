export default function ClassesLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Classes section */}
      <div>
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-7 w-32 rounded bg-muted-foreground/20" />
              <div className="h-4 w-64 rounded bg-muted-foreground/20" />
            </div>
            <div className="h-9 w-28 rounded bg-muted-foreground/20" />
          </div>
          <div className="mt-4 flex gap-6">
            <div className="h-16 w-36 rounded bg-muted-foreground/20" />
            <div className="h-16 w-36 rounded bg-muted-foreground/20" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="h-9 w-56 rounded bg-muted-foreground/20" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0">
              <div className="h-5 w-1/2 rounded bg-muted-foreground/20" />
              <div className="h-5 w-16 rounded bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>

      {/* Sections section */}
      <div>
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-7 w-28 rounded bg-muted-foreground/20" />
              <div className="h-4 w-56 rounded bg-muted-foreground/20" />
            </div>
            <div className="h-9 w-28 rounded bg-muted-foreground/20" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="h-9 w-56 rounded bg-muted-foreground/20" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0">
              <div className="h-5 w-1/3 rounded bg-muted-foreground/20" />
              <div className="h-5 w-1/4 rounded bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
