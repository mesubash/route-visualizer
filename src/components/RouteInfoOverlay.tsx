import { Milestone, Clock, MapPin, Mountain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RouteFeature } from "@/types/route";
import { formatDistance, formatDuration } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RouteInfoOverlayProps {
  route: RouteFeature | null;
  onClose?: () => void;
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

export default function RouteInfoOverlay({ route, onClose }: RouteInfoOverlayProps) {
  if (!route) return null;

  const { properties, geometry } = route;
  const difficulty = properties.roadType || "Unknown";
  const difficultyColor = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Unknown;

  return (
    <div className="absolute top-4 right-4 z-[1000] w-64 rounded-lg bg-card/95 backdrop-blur-sm shadow-lg border overflow-hidden animate-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="px-3 py-2.5 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {properties.routeName}
            </h3>
            <div className="mt-1 flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", difficultyColor)} />
              <span className="text-xs text-muted-foreground">{difficulty}</span>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0 -mr-1 -mt-1"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
              <Milestone className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Distance</p>
              <p className="font-semibold">{formatDistance(properties.distance)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Duration</p>
              <p className="font-semibold">{formatDuration(properties.duration)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">Route Points</span>
          </div>
          <Badge variant="outline" className="h-5 text-[10px] font-mono">
            {geometry.coordinates.length}
          </Badge>
        </div>

        {/* Altitude info if available */}
        {(properties.minAltitude || properties.maxAltitude) && (
          <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs">
              <Mountain className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Altitude</span>
            </div>
            <span className="text-xs font-medium">
              {properties.minAltitude || 0}m - {properties.maxAltitude || 0}m
            </span>
          </div>
        )}

        {/* Region if available */}
        {properties.region && (
          <div className="text-xs text-muted-foreground text-center pt-1">
            <span className="font-medium text-foreground">{properties.region}</span> Region
          </div>
        )}
      </div>
    </div>
  );
}
