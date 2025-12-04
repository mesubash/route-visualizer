import { useState, useCallback } from "react";
import {
  RouteFeature,
  RouteStatus,
  Coordinates,
  RouteSearchParams,
  RouteRequest,
  routeResponseToFeature,
} from "@/types/route";
import {
  fetchRoutes,
  fetchRoutesWithParams,
  createRoute as apiCreateRoute,
  updateRoute as apiUpdateRoute,
  deleteRoute as apiDeleteRoute,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

interface UseRoutesReturn {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  status: RouteStatus;
  fetchRouteData: (
    originLat?: number,
    originLng?: number,
    destLat?: number,
    destLng?: number
  ) => Promise<void>;
  fetchRoutesWithSearch: (params: RouteSearchParams) => Promise<void>;
  selectRoute: (routeId: string) => void;
  addRoute: (
    name: string,
    points: Coordinates[],
    region?: string
  ) => Promise<boolean>;
  updateRoute: (routeId: string, points: Coordinates[]) => Promise<boolean>;
  deleteRoute: (routeId: string) => Promise<boolean>;
  clearRoutes: () => void;
  requiresAuth: () => boolean;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(coords: Coordinates[]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = (coords[i].lat * Math.PI) / 180;
    const lat2 = (coords[i + 1].lat * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLng = ((coords[i + 1].lng - coords[i].lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += 6371000 * c;
  }
  return total;
}

export function useRoutes(): UseRoutesReturn {
  const [routes, setRoutes] = useState<RouteFeature[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteFeature | null>(null);
  const [status, setStatus] = useState<RouteStatus>("idle");

  const fetchRouteData = useCallback(
    async (
      originLat?: number,
      originLng?: number,
      destLat?: number,
      destLng?: number
    ) => {
      setStatus("loading");
      try {
        const response = await fetchRoutes(
          originLat,
          originLng,
          destLat,
          destLng
        );
        if (response.success && response.data.features.length > 0) {
          setRoutes(response.data.features);
          setSelectedRoute(response.data.features[0]);
          setStatus("success");
          toast({
            title: "Routes Loaded",
            description: `Found ${response.data.features.length} route(s).`,
          });
        } else {
          throw new Error(response.error || "No routes found");
        }
      } catch (err) {
        setStatus("error");
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to fetch routes",
          variant: "destructive",
        });
      }
    },
    []
  );

  const fetchRoutesWithSearch = useCallback(
    async (params: RouteSearchParams) => {
      setStatus("loading");
      try {
        const response = await fetchRoutesWithParams(params);
        if (response.success && response.data.features.length > 0) {
          setRoutes(response.data.features);
          setSelectedRoute(response.data.features[0]);
          setStatus("success");
          toast({
            title: "Routes Loaded",
            description: `Found ${response.data.features.length} route(s).`,
          });
        } else {
          throw new Error(response.error || "No routes found");
        }
      } catch (err) {
        setStatus("error");
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to fetch routes",
          variant: "destructive",
        });
      }
    },
    []
  );

  const selectRoute = useCallback(
    (routeId: string) => {
      const route = routes.find((r) => r.properties.id === routeId);
      if (route) {
        setSelectedRoute(route);
      }
    },
    [routes]
  );

  const addRoute = useCallback(
    async (
      name: string,
      points: Coordinates[],
      region: string = "Custom"
    ): Promise<boolean> => {
      // Check if authenticated for API call
      if (!isAuthenticated()) {
        // Add locally only (will be lost on refresh)
        const distance = calculateDistance(points);
        const duration = (distance / 1000) * 72;

        const newRoute: RouteFeature = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: points.map((p) => [p.lng, p.lat]),
          },
          properties: {
            id: `local-route-${Date.now()}`,
            distance,
            duration,
            routeName: name,
            roadType: "Custom",
            waypoints: points.map((p, i) => ({
              lat: p.lat,
              lng: p.lng,
              name:
                i === 0
                  ? "Start"
                  : i === points.length - 1
                  ? "End"
                  : `Point ${i + 1}`,
              order: i,
            })),
            createdAt: new Date().toISOString(),
          },
        };

        setRoutes((prev) => [...prev, newRoute]);
        setSelectedRoute(newRoute);
        toast({
          title: "Route Added Locally",
          description: "Sign in as admin to save routes permanently.",
        });
        return true;
      }

      // Make API call to create route
      try {
        const distance = calculateDistance(points);
        const routeRequest: RouteRequest = {
          name,
          region,
          maxAltitude: 0, // Default, could be calculated from elevation data
          distanceKm: distance / 1000,
          geometryCoordinates: points.map(
            (p) => [p.lng, p.lat] as [number, number]
          ),
          isActive: true,
        };

        const response = await apiCreateRoute(routeRequest);

        if (response.success && response.data) {
          const newRoute = routeResponseToFeature(response.data);
          setRoutes((prev) => [...prev, newRoute]);
          setSelectedRoute(newRoute);
          toast({
            title: "Route Created",
            description: `"${name}" has been saved to the server.`,
          });
          return true;
        } else {
          throw new Error("Failed to create route");
        }
      } catch (err) {
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to create route",
          variant: "destructive",
        });
        return false;
      }
    },
    []
  );

  const updateRoute = useCallback(
    async (routeId: string, points: Coordinates[]): Promise<boolean> => {
      const distance = calculateDistance(points);
      const duration = (distance / 1000) * 72;
      const existingRoute = routes.find((r) => r.properties.id === routeId);

      // Check if this is a local route or if not authenticated
      if (!isAuthenticated() || routeId.startsWith("local-")) {
        // Update locally only
        setRoutes((prev) =>
          prev.map((route) => {
            if (route.properties.id !== routeId) return route;
            return {
              ...route,
              geometry: {
                ...route.geometry,
                coordinates: points.map(
                  (p) => [p.lng, p.lat] as [number, number]
                ),
              },
              properties: {
                ...route.properties,
                distance,
                duration,
                waypoints: points.map((p, i) => ({
                  lat: p.lat,
                  lng: p.lng,
                  name:
                    i === 0
                      ? "Start"
                      : i === points.length - 1
                      ? "End"
                      : `Point ${i + 1}`,
                  order: i,
                })),
              },
            };
          })
        );

        setSelectedRoute((prev) => {
          if (prev?.properties.id !== routeId) return prev;
          return {
            ...prev,
            geometry: {
              ...prev.geometry,
              coordinates: points.map(
                (p) => [p.lng, p.lat] as [number, number]
              ),
            },
            properties: {
              ...prev.properties,
              distance,
              duration,
              waypoints: points.map((p, i) => ({
                lat: p.lat,
                lng: p.lng,
                name:
                  i === 0
                    ? "Start"
                    : i === points.length - 1
                    ? "End"
                    : `Point ${i + 1}`,
                order: i,
              })),
            },
          };
        });

        if (!routeId.startsWith("local-")) {
          toast({
            title: "Route Updated Locally",
            description: "Sign in as admin to save changes permanently.",
          });
        }
        return true;
      }

      // Make API call to update route
      try {
        const routeRequest: RouteRequest = {
          name: existingRoute?.properties.routeName || "Updated Route",
          region: "Custom",
          maxAltitude: 0,
          distanceKm: distance / 1000,
          geometryCoordinates: points.map(
            (p) => [p.lng, p.lat] as [number, number]
          ),
          isActive: true,
        };

        const response = await apiUpdateRoute(routeId, routeRequest);

        if (response.success && response.data) {
          const updatedRoute = routeResponseToFeature(response.data);
          setRoutes((prev) =>
            prev.map((route) =>
              route.properties.id === routeId ? updatedRoute : route
            )
          );
          setSelectedRoute(updatedRoute);
          toast({
            title: "Route Updated",
            description: "Changes have been saved to the server.",
          });
          return true;
        } else {
          throw new Error("Failed to update route");
        }
      } catch (err) {
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to update route",
          variant: "destructive",
        });
        return false;
      }
    },
    [routes]
  );

  const deleteRoute = useCallback(async (routeId: string): Promise<boolean> => {
    // Check if this is a local route or if not authenticated
    if (!isAuthenticated() || routeId.startsWith("local-")) {
      setRoutes((prev) => prev.filter((r) => r.properties.id !== routeId));
      setSelectedRoute((prev) =>
        prev?.properties.id === routeId ? null : prev
      );
      return true;
    }

    // Make API call to delete route
    try {
      const response = await apiDeleteRoute(routeId);

      if (response.success) {
        setRoutes((prev) => prev.filter((r) => r.properties.id !== routeId));
        setSelectedRoute((prev) =>
          prev?.properties.id === routeId ? null : prev
        );
        toast({
          title: "Route Deleted",
          description: "Route has been removed from the server.",
        });
        return true;
      } else {
        throw new Error("Failed to delete route");
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete route",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  const requiresAuth = useCallback(() => {
    return !isAuthenticated();
  }, []);

  const clearRoutes = useCallback(() => {
    setRoutes([]);
    setSelectedRoute(null);
    setStatus("idle");
  }, []);

  return {
    routes,
    selectedRoute,
    status,
    fetchRouteData,
    fetchRoutesWithSearch,
    selectRoute,
    addRoute,
    updateRoute,
    deleteRoute,
    clearRoutes,
    requiresAuth,
  };
}
