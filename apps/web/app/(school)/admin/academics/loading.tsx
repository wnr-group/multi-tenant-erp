export default function AcademicsLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Page header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 rounded-md bg-gray-200" />
        <div className="mt-2 h-4 w-72 rounded-md bg-gray-200" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <div className="h-10 w-64 rounded-md bg-gray-200" />
        <div className="h-10 rounded-md bg-gray-200" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-gray-100" />
        ))}
      </div>

      {/* Exams section skeleton */}
      <div>
        <div className="mb-8">
          <div className="h-7 w-32 rounded-md bg-gray-200" />
          <div className="mt-2 h-4 w-56 rounded-md bg-gray-200" />
        </div>
        <div className="space-y-3">
          <div className="h-10 w-64 rounded-md bg-gray-200" />
          <div className="h-10 rounded-md bg-gray-200" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
