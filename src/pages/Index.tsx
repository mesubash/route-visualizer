import { useMemo, useState, useCallback } from "react";
import { Map, Github } from "lucide-react";
import MapView from "@/components/MapView";
import RouteDetailsPanel from "@/components/RouteDetailsPanel";
import RouteList from "@/components/RouteList";
import DrawingControls from "@/components/DrawingControls";
import { useRoutes } from "@/hooks/useRoutes";
import { Coordinates } from "@/types/route";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const {
    routes,
    selectedRoute,
    selectRoute,
    addRoute,
  } = useRoutes();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<Coordinates[]>([]);
  const [routeName, setRouteName] = useState("");

  const { origin, destination } = useMemo(() => {
    if (!selectedRoute || !selectedRoute.properties.waypoints?.length) {
      return { origin: null, destination: null };
    }

    const waypoints = selectedRoute.properties.waypoints;
    const originWp = waypoints[0];
    const destWp = waypoints[waypoints.length - 1];

    return {
      origin: { lat: originWp.lat, lng: originWp.lng } as Coordinates,
      destination: { lat: destWp.lat, lng: destWp.lng } as Coordinates,
    };
  }, [selectedRoute]);

  const handleMapClick = useCallback((coords: Coordinates) => {
    setDrawnPoints((prev) => [...prev, coords]);
  }, []);

  const handleToggleDrawing = useCallback(() => {
    setIsDrawing((prev) => !prev);
    if (isDrawing) {
      setDrawnPoints([]);
      setRouteName("");
    }
  }, [isDrawing]);

  const handleClearPoints = useCallback(() => {
    setDrawnPoints([]);
  }, []);

  const handleUndoLastPoint = useCallback(() => {
    setDrawnPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleSaveRoute = useCallback(() => {
    if (drawnPoints.length < 2 || !routeName.trim()) return;

    addRoute(routeName.trim(), drawnPoints);
    toast({
      title: "Route Created",
      description: `"${routeName}" has been added to your routes.`,
    });

    setIsDrawing(false);
    setDrawnPoints([]);
    setRouteName("");
  }, [drawnPoints, routeName, addRoute]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">RouteViz</h1>
            <p className="text-xs text-muted-foreground">
              Route Visualization
            </p>
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Github className="h-5 w-5" />
        </a>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-muted/30 p-4 lg:w-96">
          <DrawingControls
            isDrawing={isDrawing}
            drawnPoints={drawnPoints}
            routeName={routeName}
            onToggleDrawing={handleToggleDrawing}
            onClearPoints={handleClearPoints}
            onSaveRoute={handleSaveRoute}
            onRouteNameChange={setRouteName}
            onUndoLastPoint={handleUndoLastPoint}
          />

          {routes.length > 0 && (
            <>
              <RouteList
                routes={routes}
                selectedRoute={selectedRoute}
                onSelectRoute={selectRoute}
              />
              <RouteDetailsPanel route={selectedRoute} />
            </>
          )}

          {routes.length === 0 && !isDrawing && (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              <p>No routes yet. Start drawing to create one!</p>
            </div>
          )}
        </aside>

        {/* Map Container */}
        <main className="relative flex-1 p-4">
          <MapView
            routes={routes}
            selectedRoute={selectedRoute}
            origin={origin}
            destination={destination}
            isDrawing={isDrawing}
            drawnPoints={drawnPoints}
            onMapClick={handleMapClick}
          />

          {/* Map overlay info */}
          {routes.length === 0 && !isDrawing && (
            <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card/95 p-6 text-center shadow-floating backdrop-blur">
              <Map className="mx-auto mb-3 h-10 w-10 text-primary/60" />
              <h2 className="text-lg font-semibold">Welcome to RouteViz</h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Click "Start Drawing" in the sidebar to create your first route
                by clicking points on the map.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
