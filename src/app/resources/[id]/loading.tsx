function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function ResourceDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      <div className="flex flex-col" style={{ height: "calc(100vh - 110px)" }}>
        {/* Title row */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 mb-3">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex-1 flex gap-3">
          {/* PDF viewer area (65%) */}
          <div className="flex-[65] rounded-xl border bg-muted/20 animate-pulse" />

          {/* Drag handle */}
          <div className="w-2 flex items-center justify-center">
            <div className="h-16 w-1 rounded-full bg-border" />
          </div>

          {/* Sidebar (35%) */}
          <div className="flex-[35] rounded-xl border bg-card p-4 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 border-b pb-3">
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 flex-1 rounded-md" />
            </div>
            {/* Content */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
