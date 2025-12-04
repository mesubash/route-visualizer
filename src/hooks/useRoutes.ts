import { useState, useCallback } from "react";
import { RouteFeature, Coordinates } from "@/types/route";

interface UseRoutesReturn {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  selectRoute: (routeId: string) => void;
  addRoute: (name: string, points: Coordinates[]) => void;
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
    total += 6371000 * c; // Earth radius in meters
  }
  return total;
}

export function useRoutes(): UseRoutesReturn {
  const [routes, setRoutes] = useState<RouteFeature[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteFeature | null>(null);

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
    const duration = (distance / 1000) * 72; // Assume ~50km/h average speed

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

  const deleteRoute = useCallback((routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.properties.id !== routeId));
    setSelectedRoute((prev) =>
      prev?.properties.id === routeId ? null : prev
    );
  }, []);

  const clearRoutes = useCallback(() => {
    setRoutes([]);
    setSelectedRoute(null);
  }, []);

  return {
    routes,
    selectedRoute,
    selectRoute,
    addRoute,
    deleteRoute,
    clearRoutes,
  };
}
