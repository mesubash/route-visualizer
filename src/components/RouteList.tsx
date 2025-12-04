import { useState, useMemo } from "react";
import {
  Route as RouteIcon,
  Clock,
  Milestone,
  Check,
  Mountain,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RouteFeature } from "@/types/route";
import { formatDistance, formatDuration } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RouteListProps {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  onSelectRoute: (routeId: string) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-green-500/10 text-green-600 border-green-500/20",
  MODERATE: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  HARD: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  VERY_HARD: "bg-red-500/10 text-red-600 border-red-500/20",
  EXTREME: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Custom: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Unknown: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export default function RouteList({
  routes,
  selectedRoute,
  onSelectRoute,
}: RouteListProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredRoutes = useMemo(() => {
    if (!localSearch.trim()) return routes;
    const searchLower = localSearch.toLowerCase();
    return routes.filter(
      (route) =>
        route.properties.routeName.toLowerCase().includes(searchLower) ||
        route.properties.roadType?.toLowerCase().includes(searchLower)
    );
  }, [routes, localSearch]);

  if (routes.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RouteIcon className="h-4 w-4 text-primary" />
            Routes
            <Badge variant="secondary" className="ml-1">
              {filteredRoutes.length}
              {filteredRoutes.length !== routes.length && `/${routes.length}`}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-2">
          {/* Local Search */}
          {routes.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter routes..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          )}

          {/* Route List */}
          <ScrollArea className="h-[280px] pr-3">
            <div className="space-y-2">
              {filteredRoutes.map((route, index) => {
                const isSelected =
                  selectedRoute?.properties.id === route.properties.id;
                const difficulty = route.properties.roadType || "Unknown";
                const difficultyColor =
                  DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Unknown;

                return (
                  <button
                    key={route.properties.id}
                    onClick={() => onSelectRoute(route.properties.id)}
                    className={cn(
                      "relative w-full rounded-lg border p-3 text-left transition-all duration-200",
                      "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}

                    {/* Route info */}
                    <div className="pr-7">
                      <div className="flex items-start gap-2">
                        <span className="font-medium leading-tight line-clamp-1">
                          {route.properties.routeName}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Milestone className="h-3 w-3" />
                          {formatDistance(route.properties.distance)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(route.properties.duration)}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] h-5 border", difficultyColor)}
                        >
                          <Mountain className="mr-1 h-2.5 w-2.5" />
                          {difficulty}
                        </Badge>
                        {index === 0 && !localSearch && (
                          <Badge className="h-5 bg-emerald-500/90 text-[10px] text-white">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredRoutes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No routes match your filter
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setLocalSearch("")}
                    className="mt-1 h-auto p-0 text-xs"
                  >
                    Clear filter
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
