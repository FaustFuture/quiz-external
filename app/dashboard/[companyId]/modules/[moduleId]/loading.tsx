import { Skeleton } from "@/components/ui/skeleton"

/**
 * PERFORMANCE OPTIMIZATION: Loading UI for module detail page
 * Provides better perceived performance with skeleton screens
 */
export default function ModuleLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto px-8 h-16 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </header>

      <main className="container mx-auto p-8">
        {/* Back Button */}
        <Skeleton className="h-10 w-40 mb-6" />

        {/* Module Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-12 w-96 mb-2" />
              <Skeleton className="h-6 w-full max-w-2xl" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

