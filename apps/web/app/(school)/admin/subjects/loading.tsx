export default function SubjectsLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-8 w-28 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-56 rounded bg-gray-200" />
          </div>
          <div className="h-8 w-28 rounded bg-gray-200" />
        </div>
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border bg-white p-4">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="mt-2 h-6 w-12 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Search bar + filter */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 flex-1 rounded bg-gray-200" />
        <div className="h-9 w-32 rounded bg-gray-200" />
      </div>

      {/* Table rows */}
      <div className="overflow-hidden rounded-lg border bg-white">
        {/* Header */}
        <div className="grid grid-cols-3 border-b bg-gray-50 px-4 py-3">
          {["Subject", "Code", "Class"].map((col) => (
            <div key={col} className="h-3 w-16 rounded bg-gray-200" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-3 items-center border-b px-4 py-3 last:border-0"
          >
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
