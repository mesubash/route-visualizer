import { Route as RouteIcon, Clock, Milestone, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RouteFeature } from "@/types/route";
import { formatDistance, formatDuration } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RouteListProps {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  onSelectRoute: (routeId: string) => void;
}

export default function RouteList({
  routes,
  selectedRoute,
  onSelectRoute,
}: RouteListProps) {
  if (routes.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RouteIcon className="h-4 w-4 text-primary" />
          Available Routes
          <Badge variant="secondary" className="ml-auto">
            {routes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {routes.map((route, index) => {
          const isSelected =
            selectedRoute?.properties.id === route.properties.id;
          const isFastest = index === 0;

          return (
            <button
              key={route.properties.id}
              onClick={() => onSelectRoute(route.properties.id)}
              className={cn(
                "relative w-full rounded-lg border p-3 text-left transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              {/* Route info */}
              <div className="pr-8">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{route.properties.routeName}</span>
                  {isFastest && (
                    <Badge className="h-5 bg-success text-xs text-success-foreground">
                      Fastest
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Milestone className="h-3.5 w-3.5" />
                    {formatDistance(route.properties.distance)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(route.properties.duration)}
                  </div>
                </div>

                {route.properties.roadType && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {route.properties.roadType}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
