export default function Loading() {
  return (
    <div className="container-narrow py-12">
      <div className="animate-pulse space-y-8">
        {/* Hero skeleton */}
        <div className="h-72 bg-base-200/60 rounded-2xl" />

        {/* Two-column grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-base-200/60 rounded-2xl" />
          <div className="h-48 bg-base-200/60 rounded-2xl" />
        </div>

        {/* Text skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-base-200/60 rounded w-3/4" />
          <div className="h-4 bg-base-200/60 rounded w-full" />
          <div className="h-4 bg-base-200/60 rounded w-5/6" />
        </div>
      </div>
    </div>
  )
}
