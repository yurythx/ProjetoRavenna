export function SkeletonCard() {
  return (
    <div className="card h-full overflow-hidden">
      {/* Image skeleton */}
      <div className="aspect-[16/9] skeleton" />

      {/* Content skeleton */}
      <div className="p-5 space-y-3">
        {/* Metadata skeleton */}
        <div className="flex gap-4">
          <div className="h-3 w-20 rounded skeleton" />
          <div className="h-3 w-20 rounded skeleton" />
        </div>

        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-6 w-full rounded skeleton" />
          <div className="h-6 w-3/4 rounded skeleton" />
        </div>

        {/* Excerpt skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-2/3 rounded skeleton" />
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 rounded-full skeleton" />
          <div className="h-6 w-20 rounded-full skeleton" />
        </div>

        {/* Read more skeleton */}
        <div className="h-4 w-24 rounded skeleton pt-2" />
      </div>
    </div>
  );
}
