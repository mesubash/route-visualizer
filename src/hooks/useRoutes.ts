import { useState, useCallback } from "react";
import {
  RouteFeature,
  RouteStatus,
  Coordinates,
  RouteSearchParams,
  RouteRequest,
  DifficultyLevel,
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

// Route creation options with all required API fields
export interface RouteCreateOptions {
  name: string;
  region: string;
  minAltitude: number;
  maxAltitude: number;
  difficultyLevel: DifficultyLevel;
  description?: string;
  trekName?: string;
  durationDays?: number;
  distanceKm?: number; // Optional: if not provided, will be calculated from coordinates
  coordinates?: Coordinates[]; // Optional: if provided, use these instead of points parameter
}

// Options for the useRoutes hook
export interface UseRoutesOptions {
  onAuthRequired?: () => void;
}

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
    points: Coordinates[],
    options: RouteCreateOptions
  ) => Promise<boolean>;
  updateRoute: (
    routeId: string,
    points: Coordinates[],
    options?: Partial<RouteCreateOptions>
  ) => Promise<boolean>;
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

export function useRoutes(options?: UseRoutesOptions): UseRoutesReturn {
  const { onAuthRequired } = options || {};
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
      points: Coordinates[],
      options: RouteCreateOptions
    ): Promise<boolean> => {
      const {
        name,
        region,
        minAltitude,
        maxAltitude,
        difficultyLevel,
        description,
        trekName,
        durationDays,
        distanceKm: providedDistanceKm,
        coordinates: optionCoordinates,
      } = options;

      // Use coordinates from options if provided, otherwise use points parameter
      const routePoints =
        optionCoordinates && optionCoordinates.length > 0
          ? optionCoordinates
          : points;

      // Check if authenticated for API call
      if (!isAuthenticated()) {
        // Prompt for login
        toast({
          title: "Authentication Required",
          description: "Please sign in to create routes.",
          variant: "destructive",
        });
        onAuthRequired?.();
        return false;
      }

      // Make API call to create route
      try {
        // Use provided distanceKm or calculate from coordinates
        const calculatedDistance = calculateDistance(routePoints) / 1000;
        const distanceKm = providedDistanceKm ?? calculatedDistance;
        const routeRequest: RouteRequest = {
          name,
          region,
          minAltitude,
          maxAltitude,
          difficultyLevel,
          distanceKm,
          geometryCoordinates: routePoints.map(
            (p) => [p.lng, p.lat] as [number, number]
          ),
          description,
          trekName,
          durationDays,
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
          // Check if it's an auth error and prompt for re-login
          if (
            response.message?.toLowerCase().includes("unauthorized") ||
            response.message?.toLowerCase().includes("not authenticated") ||
            response.message?.toLowerCase().includes("401")
          ) {
            toast({
              title: "Session Expired",
              description: "Please sign in again to continue.",
              variant: "destructive",
            });
            onAuthRequired?.();
            return false;
          }
          // Use the message from the API response if available
          throw new Error(response.message || "Failed to create route");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create route";
        // Check for auth-related errors
        if (
          errorMessage.toLowerCase().includes("unauthorized") ||
          errorMessage.toLowerCase().includes("401")
        ) {
          toast({
            title: "Session Expired",
            description: "Please sign in again to continue.",
            variant: "destructive",
          });
          onAuthRequired?.();
          return false;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }
    },
    [onAuthRequired]
  );

  const updateRoute = useCallback(
    async (
      routeId: string,
      points: Coordinates[],
      options?: Partial<RouteCreateOptions>
    ): Promise<boolean> => {
      const calculatedDistanceMeters = calculateDistance(points);
      const calculatedDistanceKm = calculatedDistanceMeters / 1000;
      const distanceKm = options?.distanceKm ?? calculatedDistanceKm;
      const distanceMeters = distanceKm * 1000;
      const existingRoute = routes.find((r) => r.properties.id === routeId);

      // Check if this is a local route (allow updates to local routes without auth)
      if (routeId.startsWith("local-")) {
        const duration = options?.durationDays ?? distanceKm * 72;
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
                distance: distanceMeters,
                duration,
                routeName: options?.name || route.properties.routeName,
                roadType: options?.difficultyLevel || route.properties.roadType,
                region: options?.region || route.properties.region,
                minAltitude:
                  options?.minAltitude ?? route.properties.minAltitude,
                maxAltitude:
                  options?.maxAltitude ?? route.properties.maxAltitude,
                description:
                  options?.description || route.properties.description,
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
              distance: distanceMeters,
              duration,
              routeName: options?.name || prev.properties.routeName,
              roadType: options?.difficultyLevel || prev.properties.roadType,
              region: options?.region || prev.properties.region,
              minAltitude: options?.minAltitude ?? prev.properties.minAltitude,
              maxAltitude: options?.maxAltitude ?? prev.properties.maxAltitude,
              description: options?.description || prev.properties.description,
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
        return true;
      }

      // For server routes, require authentication
      if (!isAuthenticated()) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to update routes.",
          variant: "destructive",
        });
        onAuthRequired?.();
        return false;
      }

      // Make API call to update route
      try {
        // Use provided distanceKm or calculate from coordinates
        const calculatedDistance = calculateDistance(points) / 1000;
        const distanceKm = options?.distanceKm ?? calculatedDistance;

        const routeRequest: RouteRequest = {
          name:
            options?.name ||
            existingRoute?.properties.routeName ||
            "Updated Route",
          region:
            options?.region || existingRoute?.properties.region || "Custom",
          minAltitude:
            options?.minAltitude ?? existingRoute?.properties.minAltitude ?? 0,
          maxAltitude:
            options?.maxAltitude ?? existingRoute?.properties.maxAltitude ?? 0,
          difficultyLevel:
            options?.difficultyLevel ||
            (existingRoute?.properties.roadType as DifficultyLevel) ||
            "MODERATE",
          distanceKm,
          geometryCoordinates: points.map(
            (p) => [p.lng, p.lat] as [number, number]
          ),
          description:
            options?.description || existingRoute?.properties.description,
          trekName: options?.trekName || existingRoute?.properties.trekName,
          durationDays:
            options?.durationDays || existingRoute?.properties.durationDays,
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
          // Check if it's an auth error and prompt for re-login
          if (
            response.message?.toLowerCase().includes("unauthorized") ||
            response.message?.toLowerCase().includes("not authenticated") ||
            response.message?.toLowerCase().includes("401")
          ) {
            toast({
              title: "Session Expired",
              description: "Please sign in again to continue.",
              variant: "destructive",
            });
            onAuthRequired?.();
            return false;
          }
          // Use the message from the API response if available
          throw new Error(response.message || "Failed to update route");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update route";
        // Check for auth-related errors
        if (
          errorMessage.toLowerCase().includes("unauthorized") ||
          errorMessage.toLowerCase().includes("401")
        ) {
          toast({
            title: "Session Expired",
            description: "Please sign in again to continue.",
            variant: "destructive",
          });
          onAuthRequired?.();
          return false;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }
    },
    [routes, onAuthRequired]
  );

  const deleteRoute = useCallback(
    async (routeId: string): Promise<boolean> => {
      // Allow deleting local routes without auth
      if (routeId.startsWith("local-")) {
        setRoutes((prev) => prev.filter((r) => r.properties.id !== routeId));
        setSelectedRoute((prev) =>
          prev?.properties.id === routeId ? null : prev
        );
        return true;
      }

      // For server routes, require authentication
      if (!isAuthenticated()) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to delete routes.",
          variant: "destructive",
        });
        onAuthRequired?.();
        return false;
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
          // Check if it's an auth error and prompt for re-login
          if (
            response.message?.toLowerCase().includes("unauthorized") ||
            response.message?.toLowerCase().includes("not authenticated") ||
            response.message?.toLowerCase().includes("401")
          ) {
            toast({
              title: "Session Expired",
              description: "Please sign in again to continue.",
              variant: "destructive",
            });
            onAuthRequired?.();
            return false;
          }
          // Use the message from the API response
          throw new Error(response.message || "Failed to delete route");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete route";
        // Check for auth-related errors
        if (
          errorMessage.toLowerCase().includes("unauthorized") ||
          errorMessage.toLowerCase().includes("401")
        ) {
          toast({
            title: "Session Expired",
            description: "Please sign in again to continue.",
            variant: "destructive",
          });
          onAuthRequired?.();
          return false;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }
    },
    [onAuthRequired]
  );

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
