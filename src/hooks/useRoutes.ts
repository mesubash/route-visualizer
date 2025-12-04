import { useState, useCallback } from "react";
import { RouteFeature, RouteStatus, Coordinates } from "@/types/route";
import { fetchRoutes } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface UseRoutesReturn {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  status: RouteStatus;
  fetchRouteData: (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => Promise<void>;
  selectRoute: (routeId: string) => void;
  addRoute: (name: string, points: Coordinates[]) => void;
  updateRoute: (routeId: string, points: Coordinates[]) => void;
  deleteRoute: (routeId: string) => void;
  clearRoutes: () => void;
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
      originLat: number,
      originLng: number,
      destLat: number,
      destLng: number
    ) => {
      setStatus("loading");
      try {
        const response = await fetchRoutes(originLat, originLng, destLat, destLng);
        if (response.success && response.data.features.length > 0) {
          setRoutes(response.data.features);
          setSelectedRoute(response.data.features[0]);
          setStatus("success");
          toast({
            title: "Routes Loaded",
            description: `Found ${response.data.features.length} route(s).`,
          });
        } else {
          throw new Error("No routes found");
        }
      } catch (err) {
        setStatus("error");
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to fetch routes",
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

  const addRoute = useCallback((name: string, points: Coordinates[]) => {
    const distance = calculateDistance(points);
    const duration = (distance / 1000) * 72;

    const newRoute: RouteFeature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: points.map((p) => [p.lng, p.lat]),
      },
      properties: {
        id: `route-${Date.now()}`,
        distance,
        duration,
        routeName: name,
        roadType: "Custom",
        waypoints: points.map((p, i) => ({
          lat: p.lat,
          lng: p.lng,
          name: i === 0 ? "Start" : i === points.length - 1 ? "End" : `Point ${i + 1}`,
          order: i,
        })),
        createdAt: new Date().toISOString(),
      },
    };

    setRoutes((prev) => [...prev, newRoute]);
    setSelectedRoute(newRoute);
  }, []);

  const updateRoute = useCallback((routeId: string, points: Coordinates[]) => {
    const distance = calculateDistance(points);
    const duration = (distance / 1000) * 72;

    setRoutes((prev) =>
      prev.map((route) => {
        if (route.properties.id !== routeId) return route;
        return {
          ...route,
          geometry: {
            ...route.geometry,
            coordinates: points.map((p) => [p.lng, p.lat] as [number, number]),
          },
          properties: {
            ...route.properties,
            distance,
            duration,
            waypoints: points.map((p, i) => ({
              lat: p.lat,
              lng: p.lng,
              name: i === 0 ? "Start" : i === points.length - 1 ? "End" : `Point ${i + 1}`,
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
          coordinates: points.map((p) => [p.lng, p.lat] as [number, number]),
        },
        properties: {
          ...prev.properties,
          distance,
          duration,
          waypoints: points.map((p, i) => ({
            lat: p.lat,
            lng: p.lng,
            name: i === 0 ? "Start" : i === points.length - 1 ? "End" : `Point ${i + 1}`,
            order: i,
          })),
        },
      };
    });
  }, []);

  const deleteRoute = useCallback((routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.properties.id !== routeId));
    setSelectedRoute((prev) => (prev?.properties.id === routeId ? null : prev));
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
    selectRoute,
    addRoute,
    updateRoute,
    deleteRoute,
    clearRoutes,
  };
}
