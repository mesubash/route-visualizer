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
  MapPin,
  ArrowUpRight,
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
  initialDisplayCount?: number;
}

const DIFFICULTY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  EASY: { color: "text-emerald-600", bg: "bg-emerald-500", label: "Easy" },
  MODERATE: { color: "text-amber-600", bg: "bg-amber-500", label: "Moderate" },
  HARD: { color: "text-orange-600", bg: "bg-orange-500", label: "Hard" },
  VERY_HARD: { color: "text-red-600", bg: "bg-red-500", label: "Very Hard" },
  EXTREME: { color: "text-purple-600", bg: "bg-purple-500", label: "Extreme" },
  Custom: { color: "text-blue-600", bg: "bg-blue-500", label: "Custom" },
  Unknown: { color: "text-gray-600", bg: "bg-gray-500", label: "Unknown" },
};

const ITEMS_PER_PAGE = 5;

export default function RouteList({
  routes,
  selectedRoute,
  onSelectRoute,
  initialDisplayCount = ITEMS_PER_PAGE,
}: RouteListProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayCount, setDisplayCount] = useState(initialDisplayCount);

  const filteredRoutes = useMemo(() => {
    if (!localSearch.trim()) return routes;
    const searchLower = localSearch.toLowerCase();
    return routes.filter(
      (route) =>
        route.properties.routeName.toLowerCase().includes(searchLower) ||
        route.properties.roadType?.toLowerCase().includes(searchLower) ||
        route.properties.region?.toLowerCase().includes(searchLower)
    );
  }, [routes, localSearch]);

  // Reset display count when search changes
  useMemo(() => {
    setDisplayCount(initialDisplayCount);
  }, [localSearch, initialDisplayCount]);

  const displayedRoutes = useMemo(() => {
    return filteredRoutes.slice(0, displayCount);
  }, [filteredRoutes, displayCount]);

  const hasMore = displayCount < filteredRoutes.length;
  const remainingCount = filteredRoutes.length - displayCount;

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredRoutes.length));
  };

  if (routes.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
              <RouteIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>Routes</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
              {filteredRoutes.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-2 px-3 pb-3 pt-0">
          {/* Local Search */}
          {routes.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter routes..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="h-7 pl-7 text-xs bg-muted/50 border-0"
              />
            </div>
          )}

          {/* Route List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 pr-2">
              {displayedRoutes.map((route) => {
                const isSelected = selectedRoute?.properties.id === route.properties.id;
                const difficulty = route.properties.roadType || "Unknown";
                const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Unknown;
                const region = route.properties.region;

                return (
                  <RouteItem
                    key={route.properties.id}
                    route={route}
                    isSelected={isSelected}
                    difficultyConfig={config}
                    region={region}
                    onSelect={() => onSelectRoute(route.properties.id)}
                  />
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground mt-2"
                >
                  <ChevronDown className="mr-1.5 h-3 w-3" />
                  Load {Math.min(ITEMS_PER_PAGE, remainingCount)} more
                  <span className="ml-1 text-muted-foreground/60">
                    ({remainingCount} left)
                  </span>
                </Button>
              )}

              {filteredRoutes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Search className="h-6 w-6 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">
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

// Separate RouteItem component for better modularity
interface RouteItemProps {
  route: RouteFeature;
  isSelected: boolean;
  difficultyConfig: { color: string; bg: string; label: string };
  region?: string;
  onSelect: () => void;
}

function RouteItem({ route, isSelected, difficultyConfig, region, onSelect }: RouteItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-lg p-2.5 text-left transition-all duration-150",
        "hover:bg-accent/50",
        isSelected
          ? "bg-primary/5 ring-1 ring-primary/20"
          : "bg-transparent"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Difficulty indicator dot */}
        <div className="mt-1 shrink-0">
          <div className={cn("h-2 w-2 rounded-full", difficultyConfig.bg)} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Route name */}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-medium leading-tight line-clamp-1",
              isSelected && "text-primary"
            )}>
              {route.properties.routeName}
            </span>
            {isSelected && (
              <Check className="h-3 w-3 text-primary shrink-0" />
            )}
          </div>

          {/* Region */}
          {region && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-2.5 w-2.5 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground line-clamp-1">
                {region}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Milestone className="h-2.5 w-2.5" />
              <span>{formatDistance(route.properties.distance)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{formatDuration(route.properties.duration)}</span>
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              difficultyConfig.color
            )}>
              {difficultyConfig.label}
            </span>
          </div>
        </div>

        {/* Arrow indicator on hover */}
        <ArrowUpRight className={cn(
          "h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected && "text-primary opacity-100"
        )} />
      </div>
    </button>
  );
}
