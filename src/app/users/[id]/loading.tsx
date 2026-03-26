function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function ResourceCardSkeleton() {
  return (
    <div className="group relative flex items-start gap-4 p-5 bg-card border rounded-xl">
      <div className="shrink-0 mt-1">
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-2 rounded" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

export default function UserProfileLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-10 max-w-4xl space-y-8">
        <Skeleton className="h-5 w-32" />

        <div className="pb-8 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mt-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2 min-w-0">
                  <Skeleton className="h-10 w-60" />
                  <Skeleton className="h-5 w-56" />
                </div>
              </div>
              <Skeleton className="h-4 w-48 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end gap-6 w-full md:w-auto">
              <Skeleton className="h-10 w-28 rounded-md" />
              <div className="grid grid-cols-2 gap-2 w-full md:w-44">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-8 w-52" />
          {Array.from({ length: 4 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
