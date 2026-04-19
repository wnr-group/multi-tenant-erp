export default function AnnouncementsLoading() {
  return (
    <div className="animate-pulse">
      {/* PageHeader skeleton */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-44 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
          </div>
          <div className="h-8 w-40 rounded-lg bg-gray-200" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="h-20 rounded-lg bg-gray-200" />
          <div className="h-20 rounded-lg bg-gray-200" />
        </div>
      </div>

      {/* Search + filter bar skeleton */}
      <div className="mb-4 flex gap-3">
        <div className="h-9 flex-1 rounded-lg bg-gray-200" />
        <div className="h-9 w-32 rounded-lg bg-gray-200" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="h-10 bg-gray-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-gray-100 px-4 py-3">
            <div className="h-4 w-56 rounded bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="ml-auto h-4 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
