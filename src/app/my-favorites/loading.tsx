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
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export default function MyFavoritesLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-10 max-w-5xl space-y-6">
        <Skeleton className="h-5 w-40 mt-1" />
        <div className="flex items-center gap-3 mt-4">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="h-10 w-60" />
        </div>
        <Skeleton className="h-5 w-64" />

        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
