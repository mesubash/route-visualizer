import { Clock, MapPin, Route as RouteIcon, Milestone, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RouteFeature } from "@/types/route";
import { formatDistance, formatDuration } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RouteDetailsPanelProps {
  route: RouteFeature | null;
}

export default function RouteDetailsPanel({ route }: RouteDetailsPanelProps) {
  if (!route) {
    return (
      <Card className="shadow-card animate-fade-in">
        <CardContent className="flex h-48 items-center justify-center">
          <div className="text-center">
            <RouteIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Enter coordinates and find a route to see details
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { properties } = route;
  const waypoints = properties.waypoints || [];

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{properties.routeName}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Route ID: {properties.id}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {properties.roadType || "Standard"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Milestone className="h-4 w-4" />
              <span className="text-xs font-medium">Distance</span>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {formatDistance(properties.distance)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Duration</span>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {formatDuration(properties.duration)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Waypoints */}
        {waypoints.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Waypoints
            </h4>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {waypoints.map((waypoint, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 rounded-md p-2 text-sm transition-colors hover:bg-muted/50",
                      index === 0 && "text-success",
                      index === waypoints.length - 1 && "text-destructive"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                        index === 0
                          ? "bg-success/10 text-success"
                          : index === waypoints.length - 1
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">
                        {waypoint.name || `Point ${index + 1}`}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                      </p>
                    </div>
                    {index < waypoints.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Route coordinates count */}
        <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Route Points</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {route.geometry.coordinates.length}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
