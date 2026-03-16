function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function ResourceCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export default function UserProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-5">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Uploads grid */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
