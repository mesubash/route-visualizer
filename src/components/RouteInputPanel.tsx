import { useState } from "react";
import { MapPin, Navigation, Route, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RouteInputState, RouteStatus } from "@/types/route";

interface RouteInputPanelProps {
  onFetchRoute: (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => void;
  onClear: () => void;
  status: RouteStatus;
}

const defaultInput: RouteInputState = {
  origin: { lat: "40.7484", lng: "-73.9857", name: "Empire State Building" },
  destination: { lat: "40.7589", lng: "-73.9851", name: "Times Square" },
};

export default function RouteInputPanel({
  onFetchRoute,
  onClear,
  status,
}: RouteInputPanelProps) {
  const [input, setInput] = useState<RouteInputState>(defaultInput);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateCoordinate = (value: string, type: "lat" | "lng"): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (type === "lat") return num >= -90 && num <= 90;
    return num >= -180 && num <= 180;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!validateCoordinate(input.origin.lat, "lat")) {
      newErrors.originLat = "Invalid latitude (-90 to 90)";
    }
    if (!validateCoordinate(input.origin.lng, "lng")) {
      newErrors.originLng = "Invalid longitude (-180 to 180)";
    }
    if (!validateCoordinate(input.destination.lat, "lat")) {
      newErrors.destLat = "Invalid latitude (-90 to 90)";
    }
    if (!validateCoordinate(input.destination.lng, "lng")) {
      newErrors.destLng = "Invalid longitude (-180 to 180)";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onFetchRoute(
        parseFloat(input.origin.lat),
        parseFloat(input.origin.lng),
        parseFloat(input.destination.lat),
        parseFloat(input.destination.lng)
      );
    }
  };

  const handleClear = () => {
    setInput({
      origin: { lat: "", lng: "" },
      destination: { lat: "", lng: "" },
    });
    setErrors({});
    onClear();
  };

  const isLoading = status === "loading";

  return (
    <Card className="shadow-card animate-slide-in-left">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Route className="h-5 w-5 text-primary" />
          Route Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Origin */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
                <MapPin className="h-3.5 w-3.5 text-success" />
              </div>
              <Label className="text-sm font-medium">Origin</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Input
                  placeholder="Latitude"
                  value={input.origin.lat}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      origin: { ...input.origin, lat: e.target.value },
                    })
                  }
                  className={errors.originLat ? "border-destructive" : ""}
                />
                {errors.originLat && (
                  <p className="text-xs text-destructive">{errors.originLat}</p>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="Longitude"
                  value={input.origin.lng}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      origin: { ...input.origin, lng: e.target.value },
                    })
                  }
                  className={errors.originLng ? "border-destructive" : ""}
                />
                {errors.originLng && (
                  <p className="text-xs text-destructive">{errors.originLng}</p>
                )}
              </div>
            </div>
          </div>

          {/* Visual connector */}
          <div className="flex items-center justify-center">
            <div className="h-6 w-px bg-border" />
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10">
                <Navigation className="h-3.5 w-3.5 text-destructive" />
              </div>
              <Label className="text-sm font-medium">Destination</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Input
                  placeholder="Latitude"
                  value={input.destination.lat}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      destination: { ...input.destination, lat: e.target.value },
                    })
                  }
                  className={errors.destLat ? "border-destructive" : ""}
                />
                {errors.destLat && (
                  <p className="text-xs text-destructive">{errors.destLat}</p>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="Longitude"
                  value={input.destination.lng}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      destination: { ...input.destination, lng: e.target.value },
                    })
                  }
                  className={errors.destLng ? "border-destructive" : ""}
                />
                {errors.destLng && (
                  <p className="text-xs text-destructive">{errors.destLng}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding Routes...
                </>
              ) : (
                <>
                  <Route className="mr-2 h-4 w-4" />
                  Find Route
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
