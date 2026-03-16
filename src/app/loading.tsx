// Root page (home) loading skeleton
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function ResourceCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>

        {/* Filter bar */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
