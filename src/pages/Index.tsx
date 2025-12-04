import { useMemo, useState, useCallback } from "react";
import { Map, Github, Mountain, Compass, LogIn, LogOut, User } from "lucide-react";
import MapView from "@/components/MapView";
import RouteDetailsPanel from "@/components/RouteDetailsPanel";
import RouteList from "@/components/RouteList";
import DrawingControls from "@/components/DrawingControls";
import EditRouteControls from "@/components/EditRouteControls";
import SearchFilterPanel from "@/components/SearchFilterPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoutes } from "@/hooks/useRoutes";
import { useAuth } from "@/contexts/AuthContext";
import { Coordinates, RouteSearchParams } from "@/types/route";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const {
    routes,
    selectedRoute,
    status,
    fetchRouteData,
    fetchRoutesWithSearch,
    selectRoute,
    addRoute,
    updateRoute,
    clearRoutes,
  } = useRoutes();

  const { user, isLoggedIn, isAdminUser, openLoginDialog, handleLogout } = useAuth();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<Coordinates[]>([]);
  const [routeName, setRouteName] = useState("");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editPoints, setEditPoints] = useState<Coordinates[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState("search");

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

  const handleSearch = useCallback(
    (params: RouteSearchParams) => {
      fetchRoutesWithSearch(params);
    },
    [fetchRoutesWithSearch]
  );

  const handleFetchAllRoutes = useCallback(() => {
    fetchRouteData();
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
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-[2000]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm">
            <Mountain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Himalayan Routes
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Trek Visualization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {routes.length > 0 && (
            <Badge variant="secondary" className="hidden sm:flex">
              {routes.length} routes loaded
            </Badge>
          )}
          
          {/* Auth Controls */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline text-sm">
                    {user?.fullName || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdminUser && (
                  <DropdownMenuItem disabled className="text-xs">
                    <Badge variant="secondary" className="mr-2 text-[10px]">Admin</Badge>
                    Can create & edit routes
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={openLoginDialog}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-r bg-muted/20 lg:w-96">
          {/* Tabs Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col"
          >
            <div className="border-b bg-card/50 px-2 pt-2">
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="search" className="text-xs">
                  <Compass className="mr-1.5 h-3.5 w-3.5" />
                  Explore
                </TabsTrigger>
                <TabsTrigger value="create" className="text-xs">
                  <Map className="mr-1.5 h-3.5 w-3.5" />
                  Create
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Search & Filter Tab */}
              <TabsContent value="search" className="m-0 p-4 space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Compass className="h-4 w-4 text-primary" />
                      Find Routes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SearchFilterPanel
                      onSearch={handleSearch}
                      isLoading={status === "loading"}
                    />
                  </CardContent>
                </Card>

                {/* Route List */}
                {routes.length > 0 && (
                  <RouteList
                    routes={routes}
                    selectedRoute={selectedRoute}
                    onSelectRoute={selectRoute}
                  />
                )}

                {/* Route Details */}
                <RouteDetailsPanel route={selectedRoute} />
              </TabsContent>

              {/* Create Tab */}
              <TabsContent value="create" className="m-0 p-4 space-y-4">
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

                {/* Show current routes in create tab too */}
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
              </TabsContent>
            </div>
          </Tabs>
        </aside>

        {/* Map Container */}
        <main className="relative flex-1">
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
            <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card/95 p-8 text-center shadow-2xl backdrop-blur-sm max-w-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                <Mountain className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Welcome to Himalayan Routes</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore trekking routes across Nepal. Use the search panel to find routes
                by region, difficulty, or altitude.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={handleFetchAllRoutes}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Load All Routes
                </button>
                <p className="text-xs text-muted-foreground">
                  Or use filters to search specific routes
                </p>
              </div>
            </div>
          )}

          {/* Route count indicator on map */}
          {routes.length > 0 && (
            <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-card/90 backdrop-blur-sm px-3 py-2 shadow-lg border">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{routes.length}</span> routes
                {selectedRoute && (
                  <>
                    {" · "}
                    <span className="text-primary font-medium">
                      {selectedRoute.properties.routeName}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
