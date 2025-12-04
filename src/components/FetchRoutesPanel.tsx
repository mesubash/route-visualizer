import { Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteStatus } from "@/types/route";

interface FetchRoutesPanelProps {
  status: RouteStatus;
  routeCount: number;
  onFetchRoutes: () => void;
  onClearRoutes: () => void;
}

export default function FetchRoutesPanel({
  status,
  routeCount,
  onFetchRoutes,
  onClearRoutes,
}: FetchRoutesPanelProps) {
  const isLoading = status === "loading";

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-4 w-4 text-primary" />
          Load Routes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Fetch sample routes from the API to visualize on the map.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={onFetchRoutes}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Fetch Routes
              </>
            )}
          </Button>
          {routeCount > 0 && (
            <Button variant="outline" onClick={onClearRoutes}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
