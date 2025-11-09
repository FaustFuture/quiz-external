import { Skeleton } from "@/components/ui/skeleton"

/**
 * PERFORMANCE OPTIMIZATION: Loading UI for dashboard route
 * Provides better perceived performance with skeleton screens
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto px-8 h-16 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </header>
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Main Content Skeleton */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Header with button */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
              
              {/* Module Cards Grid */}
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        
        {/* Sidebar Skeleton */}
        <aside className="w-[400px] border-l border-border bg-background p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

