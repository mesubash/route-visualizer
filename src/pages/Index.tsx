import { useMemo, useState, useCallback } from "react";
import { Map, Github } from "lucide-react";
import MapView from "@/components/MapView";
import RouteDetailsPanel from "@/components/RouteDetailsPanel";
import RouteList from "@/components/RouteList";
import DrawingControls from "@/components/DrawingControls";
import EditRouteControls from "@/components/EditRouteControls";
import FetchRoutesPanel from "@/components/FetchRoutesPanel";
import { useRoutes } from "@/hooks/useRoutes";
import { Coordinates } from "@/types/route";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const {
    routes,
    selectedRoute,
    status,
    fetchRouteData,
    selectRoute,
    addRoute,
    updateRoute,
    clearRoutes,
  } = useRoutes();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<Coordinates[]>([]);
  const [routeName, setRouteName] = useState("");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editPoints, setEditPoints] = useState<Coordinates[]>([]);

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

  const handleFetchRoutes = useCallback(() => {
    fetchRouteData(40.7128, -74.006, 40.758, -73.9855);
  }, [fetchRouteData]);

  const handleMapClick = useCallback((coords: Coordinates) => {
    if (isDrawing) {
      setDrawnPoints((prev) => [...prev, coords]);
    } else if (isEditing) {
      setEditPoints((prev) => [...prev, coords]);
    }
  }, [isDrawing, isEditing]);

  // Drawing handlers
  const handleToggleDrawing = useCallback(() => {
    if (isEditing) return; // Don't allow drawing while editing
    setIsDrawing((prev) => !prev);
    if (isDrawing) {
      setDrawnPoints([]);
      setRouteName("");
    }
  }, [isDrawing, isEditing]);

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

  // Editing handlers
  const handleStartEdit = useCallback(() => {
    if (!selectedRoute || isDrawing) return;
    const points: Coordinates[] = selectedRoute.geometry.coordinates.map(
      ([lng, lat]) => ({ lat, lng })
    );
    setEditPoints(points);
    setIsEditing(true);
  }, [selectedRoute, isDrawing]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditPoints([]);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!selectedRoute || editPoints.length < 2) return;

    updateRoute(selectedRoute.properties.id, editPoints);
    toast({
      title: "Route Updated",
      description: `"${selectedRoute.properties.routeName}" has been updated.`,
    });

    setIsEditing(false);
    setEditPoints([]);
  }, [selectedRoute, editPoints, updateRoute]);

  const handleEditUndoPoint = useCallback(() => {
    setEditPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleEditClearPoints = useCallback(() => {
    setEditPoints([]);
  }, []);

  const handleEditPointDrag = useCallback((index: number, coords: Coordinates) => {
    setEditPoints((prev) => {
      const newPoints = [...prev];
      newPoints[index] = coords;
      return newPoints;
    });
  }, []);

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
            <p className="text-xs text-muted-foreground">Route Visualization</p>
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
          {/* Fetch Routes Section */}
          <FetchRoutesPanel
            status={status}
            routeCount={routes.length}
            onFetchRoutes={handleFetchRoutes}
            onClearRoutes={clearRoutes}
          />

          {/* Draw Route Section */}
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

          {/* Edit Route Section */}
          <EditRouteControls
            isEditing={isEditing}
            editPoints={editPoints}
            routeName={selectedRoute?.properties.routeName || ""}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onUndoPoint={handleEditUndoPoint}
            onClearPoints={handleEditClearPoints}
            hasSelectedRoute={!!selectedRoute && !isDrawing}
          />

          {/* Route List & Details */}
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
        </aside>

        {/* Map Container */}
        <main className="relative flex-1 p-4">
          <MapView
            routes={routes}
            selectedRoute={selectedRoute}
            origin={isEditing ? null : origin}
            destination={isEditing ? null : destination}
            isDrawing={isDrawing}
            drawnPoints={drawnPoints}
            onMapClick={handleMapClick}
            isEditing={isEditing}
            editPoints={editPoints}
            onEditPointDrag={handleEditPointDrag}
          />

          {/* Map overlay info */}
          {routes.length === 0 && !isDrawing && (
            <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card/95 p-6 text-center shadow-floating backdrop-blur">
              <Map className="mx-auto mb-3 h-10 w-10 text-primary/60" />
              <h2 className="text-lg font-semibold">Welcome to RouteViz</h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Fetch routes from the API or draw your own route on the map.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
