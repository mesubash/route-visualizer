import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteListSkeleton() {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="ml-auto h-5 w-8" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-3">
            <Skeleton className="h-5 w-32" />
            <div className="mt-2 flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RouteDetailsSkeleton() {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-6 w-20" />
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-6 w-20" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="space-y-1">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-1 h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
