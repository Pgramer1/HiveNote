function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function ProfileLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
  );
}
