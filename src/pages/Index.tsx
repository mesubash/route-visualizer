import { useMemo, Suspense, lazy } from "react";
import { Map, Github } from "lucide-react";
import RouteInputPanel from "@/components/RouteInputPanel";
import RouteDetailsPanel from "@/components/RouteDetailsPanel";
import RouteList from "@/components/RouteList";
import { RouteListSkeleton, RouteDetailsSkeleton } from "@/components/LoadingSkeleton";
import { useRoutes } from "@/hooks/useRoutes";
import { Coordinates } from "@/types/route";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load MapView to avoid SSR issues with Leaflet
const MapView = lazy(() => import("@/components/MapView"));

const MapFallback = () => (
  <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
    <Skeleton className="h-full w-full" />
  </div>
);

const Index = () => {
  const {
    routes,
    selectedRoute,
    status,
    fetchRouteData,
    selectRoute,
    clearRoutes,
  } = useRoutes();

  // Extract origin and destination from selected route
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

  const isLoading = status === "loading";

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
              PostGIS Route Visualization
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
          <RouteInputPanel
            onFetchRoute={fetchRouteData}
            onClear={clearRoutes}
            status={status}
          />

          {isLoading && (
            <>
              <RouteListSkeleton />
              <RouteDetailsSkeleton />
            </>
          )}

          {!isLoading && routes.length > 0 && (
            <>
              <RouteList
                routes={routes}
                selectedRoute={selectedRoute}
                onSelectRoute={selectRoute}
              />
              <RouteDetailsPanel route={selectedRoute} />
            </>
          )}

          {!isLoading && routes.length === 0 && status !== "idle" && (
            <RouteDetailsPanel route={null} />
          )}
        </aside>

        {/* Map Container */}
        <main className="relative flex-1 p-4">
          <Suspense fallback={<MapFallback />}>
            <MapView
              routes={routes}
              selectedRoute={selectedRoute}
              origin={origin}
              destination={destination}
            />
          </Suspense>

          {/* Map overlay info */}
          {routes.length === 0 && status === "idle" && (
            <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card/95 p-6 text-center shadow-floating backdrop-blur">
              <Map className="mx-auto mb-3 h-10 w-10 text-primary/60" />
              <h2 className="text-lg font-semibold">Welcome to RouteViz</h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Enter origin and destination coordinates in the sidebar to
                visualize routes from your PostGIS database.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
