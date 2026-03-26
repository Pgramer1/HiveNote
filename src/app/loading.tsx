function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function SectionCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-background p-4 space-y-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
      <div className="pt-1">
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <section className="relative px-6 pt-10 pb-8 lg:pt-16 lg:pb-12 overflow-hidden">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="flex justify-center">
            <Skeleton className="h-7 w-56 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-14 w-full max-w-3xl mx-auto" />
            <Skeleton className="h-14 w-2/3 max-w-2xl mx-auto" />
          </div>
          <Skeleton className="h-6 w-full max-w-2xl mx-auto" />

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Skeleton className="h-12 w-48 rounded-full" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>

          <div className="pt-10 flex items-center justify-center gap-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-10 w-px" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-12 space-y-16">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-muted/30 p-6 space-y-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="rounded-2xl border bg-muted/30 p-6 space-y-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <SectionCardSkeleton />
          <SectionCardSkeleton />
        </div>
      </section>
    </div>
  );
}
