import { useState, useCallback } from "react";
import { RouteCollection, RouteFeature, RouteStatus } from "@/types/route";
import { fetchRoutes } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface UseRoutesReturn {
  routes: RouteFeature[];
  selectedRoute: RouteFeature | null;
  status: RouteStatus;
  error: string | null;
  fetchRouteData: (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => Promise<void>;
  selectRoute: (routeId: string) => void;
  clearRoutes: () => void;
}

export function useRoutes(): UseRoutesReturn {
  const [routes, setRoutes] = useState<RouteFeature[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteFeature | null>(null);
  const [status, setStatus] = useState<RouteStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchRouteData = useCallback(
    async (
      originLat: number,
      originLng: number,
      destLat: number,
      destLng: number
    ) => {
      setStatus("loading");
      setError(null);

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
            title: "Routes Found",
            description: `Found ${response.data.features.length} route(s) between your points.`,
          });
        } else {
          throw new Error("No routes found");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch routes";
        setError(errorMessage);
        setStatus("error");
        toast({
          title: "Error",
          description: errorMessage,
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

  const clearRoutes = useCallback(() => {
    setRoutes([]);
    setSelectedRoute(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    routes,
    selectedRoute,
    status,
    error,
    fetchRouteData,
    selectRoute,
    clearRoutes,
  };
}
