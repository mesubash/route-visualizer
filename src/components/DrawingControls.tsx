import { Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coordinates } from "@/types/route";

interface DrawingControlsProps {
  isDrawing: boolean;
  drawnPoints: Coordinates[];
  routeName: string;
  onToggleDrawing: () => void;
  onClearPoints: () => void;
  onSaveRoute: () => void;
  onRouteNameChange: (name: string) => void;
  onUndoLastPoint: () => void;
}

export default function DrawingControls({
  isDrawing,
  drawnPoints,
  routeName,
  onToggleDrawing,
  onClearPoints,
  onSaveRoute,
  onRouteNameChange,
  onUndoLastPoint,
}: DrawingControlsProps) {
  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pencil className="h-4 w-4 text-primary" />
          Draw New Route
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isDrawing ? (
          <Button onClick={onToggleDrawing} className="w-full">
            <Pencil className="mr-2 h-4 w-4" />
            Start Drawing
          </Button>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="routeName">Route Name</Label>
              <Input
                id="routeName"
                value={routeName}
                onChange={(e) => onRouteNameChange(e.target.value)}
                placeholder="Enter route name..."
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                Points added: <span className="font-semibold text-foreground">{drawnPoints.length}</span>
              </p>
              {drawnPoints.length > 0 && (
                <div className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {drawnPoints.map((point, i) => (
                    <div key={i}>
                      {i + 1}. {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onUndoLastPoint}
                disabled={drawnPoints.length === 0}
                className="flex-1"
              >
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearPoints}
                disabled={drawnPoints.length === 0}
                className="flex-1"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={onToggleDrawing}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={onSaveRoute}
                disabled={drawnPoints.length < 2 || !routeName.trim()}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
