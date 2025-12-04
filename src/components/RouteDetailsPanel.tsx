import {
  Clock,
  MapPin,
  Route as RouteIcon,
  Milestone,
  ChevronRight,
  Mountain,
  Calendar,
  Info,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RouteFeature } from "@/types/route";
import { formatDistance, formatDuration } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RouteDetailsPanelProps {
  route: RouteFeature | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-green-500",
  MODERATE: "bg-yellow-500",
  HARD: "bg-orange-500",
  VERY_HARD: "bg-red-500",
  EXTREME: "bg-purple-500",
  Custom: "bg-blue-500",
  Unknown: "bg-gray-500",
};

export default function RouteDetailsPanel({ route }: RouteDetailsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!route) {
    return (
      <Card className="shadow-card animate-fade-in">
        <CardContent className="flex h-32 items-center justify-center">
          <div className="text-center">
            <Info className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Select a route to view details
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { properties } = route;
  const waypoints = properties.waypoints || [];
  const difficulty = properties.roadType || "Unknown";
  const difficultyColor = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Unknown;

  return (
    <Card className="shadow-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-tight line-clamp-2">
              {properties.routeName}
            </CardTitle>
            <div className="mt-1.5 flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", difficultyColor)} />
              <span className="text-xs text-muted-foreground">{difficulty}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 p-0"
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
        <CardContent className="space-y-4 pt-2">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-3 border border-blue-500/10">
              <div className="flex items-center gap-1.5 text-blue-600">
                <Milestone className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  Distance
                </span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {formatDistance(properties.distance)}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-3 border border-amber-500/10">
              <div className="flex items-center gap-1.5 text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  Duration
                </span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {formatDuration(properties.duration)}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Route Points</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {route.geometry.coordinates.length}
            </Badge>
          </div>

          {properties.createdAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Created {new Date(properties.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Waypoints */}
          {waypoints.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <RouteIcon className="h-3 w-3" />
                  Waypoints ({waypoints.length})
                </h4>
                <ScrollArea className="h-28">
                  <div className="space-y-1">
                    {waypoints.map((waypoint, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-2 rounded-md p-2 text-sm transition-colors hover:bg-muted/50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                            index === 0
                              ? "bg-green-500"
                              : index === waypoints.length - 1
                              ? "bg-red-500"
                              : "bg-muted-foreground/60"
                          )}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium truncate block">
                            {waypoint.name || `Point ${index + 1}`}
                          </span>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                          </p>
                        </div>
                        {index < waypoints.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
