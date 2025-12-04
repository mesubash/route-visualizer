import {
  ApiResponse,
  PaginatedResponse,
  RouteResponse,
  RouteSummaryResponse,
  RouteSearchParams,
  RouteFeature,
  RouteCollection,
  RouteApiResponse,
  RouteRequest,
  routeResponseToFeature,
} from "@/types/route";
import { getAuthHeaders } from "@/lib/auth";

// Get API base URL from environment variables
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.himalayanguardian.com";

// API endpoints
const ROUTES_API = `${API_BASE_URL}/api/routes`;
const ADMIN_ROUTES_API = `${API_BASE_URL}/api/admin/routes`;

/**
 * Build query string from search parameters
 */
function buildQueryString(params: RouteSearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.append("search", params.search);
  if (params.region) searchParams.append("region", params.region);
  if (params.difficultyLevel)
    searchParams.append("difficultyLevel", params.difficultyLevel);
  if (params.minAltitude !== undefined)
    searchParams.append("minAltitude", params.minAltitude.toString());
  if (params.maxAltitude !== undefined)
    searchParams.append("maxAltitude", params.maxAltitude.toString());
  if (params.page !== undefined)
    searchParams.append("page", params.page.toString());
  if (params.size !== undefined)
    searchParams.append("size", params.size.toString());
  if (params.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params.sortDir) searchParams.append("sortDir", params.sortDir);

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Search routes with pagination
 * GET /api/routes
 */
export async function searchRoutes(
  params: RouteSearchParams = {}
): Promise<ApiResponse<PaginatedResponse<RouteSummaryResponse>>> {
  const queryString = buildQueryString(params);
  return apiFetch<ApiResponse<PaginatedResponse<RouteSummaryResponse>>>(
    `${ROUTES_API}${queryString}`
  );
}

/**
 * Get all routes (no pagination) - for dropdowns
 * GET /api/routes/all
 */
export async function getAllRoutes(): Promise<
  ApiResponse<RouteSummaryResponse[]>
> {
  return apiFetch<ApiResponse<RouteSummaryResponse[]>>(`${ROUTES_API}/all`);
}

/**
 * Get route details by ID
 * GET /api/routes/{id}
 */
export async function getRouteById(
  id: string
): Promise<ApiResponse<RouteResponse>> {
  return apiFetch<ApiResponse<RouteResponse>>(`${ROUTES_API}/${id}`);
}

/**
 * Fetch routes and convert to RouteFeature format for map display
 * This maintains backward compatibility with existing components
 */
export async function fetchRoutes(
  originLat?: number,
  originLng?: number,
  destLat?: number,
  destLng?: number
): Promise<RouteApiResponse> {
  try {
    // Fetch all routes from the API
    const response = await getAllRoutes();

    if (!response.success || !response.data) {
      throw new Error("Failed to fetch routes");
    }

    // For each route summary, fetch full details to get geometry
    const routeDetailsPromises = response.data
      .filter((route) => route.hasGeometry && route.isActive)
      .slice(0, 20) // Limit to first 20 routes for performance
      .map(async (routeSummary) => {
        try {
          const detailResponse = await getRouteById(routeSummary.id);
          if (detailResponse.success && detailResponse.data) {
            return routeResponseToFeature(detailResponse.data);
          }
          return null;
        } catch {
          console.warn(`Failed to fetch details for route ${routeSummary.id}`);
          return null;
        }
      });

    const routeFeatures = await Promise.all(routeDetailsPromises);
    const validFeatures = routeFeatures.filter(
      (feature): feature is RouteFeature =>
        feature !== null && feature.geometry.coordinates.length > 0
    );

    const routeCollection: RouteCollection = {
      type: "FeatureCollection",
      features: validFeatures,
    };

    return {
      success: true,
      data: routeCollection,
    };
  } catch (error) {
    console.error("Error fetching routes:", error);
    return {
      success: false,
      data: { type: "FeatureCollection", features: [] },
      error: error instanceof Error ? error.message : "Failed to fetch routes",
    };
  }
}

/**
 * Fetch routes with search/filter parameters
 */
export async function fetchRoutesWithParams(
  params: RouteSearchParams
): Promise<RouteApiResponse> {
  try {
    const response = await searchRoutes(params);

    if (!response.success || !response.data) {
      throw new Error("Failed to fetch routes");
    }

    // Fetch full details for routes with geometry
    const routeDetailsPromises = response.data.content
      .filter((route) => route.hasGeometry && route.isActive)
      .map(async (routeSummary) => {
        try {
          const detailResponse = await getRouteById(routeSummary.id);
          if (detailResponse.success && detailResponse.data) {
            return routeResponseToFeature(detailResponse.data);
          }
          return null;
        } catch {
          console.warn(`Failed to fetch details for route ${routeSummary.id}`);
          return null;
        }
      });

    const routeFeatures = await Promise.all(routeDetailsPromises);
    const validFeatures = routeFeatures.filter(
      (feature): feature is RouteFeature =>
        feature !== null && feature.geometry.coordinates.length > 0
    );

    const routeCollection: RouteCollection = {
      type: "FeatureCollection",
      features: validFeatures,
    };

    return {
      success: true,
      data: routeCollection,
    };
  } catch (error) {
    console.error("Error fetching routes:", error);
    return {
      success: false,
      data: { type: "FeatureCollection", features: [] },
      error: error instanceof Error ? error.message : "Failed to fetch routes",
    };
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}

// ============================================
// ADMIN API ENDPOINTS (Require Authentication)
// ============================================

/**
 * Create a new route (Admin only)
 * POST /api/admin/routes
 */
export async function createRoute(
  route: RouteRequest
): Promise<ApiResponse<RouteResponse>> {
  return apiFetch<ApiResponse<RouteResponse>>(ADMIN_ROUTES_API, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(route),
  });
}

/**
 * Update an existing route (Admin only)
 * PUT /api/admin/routes/{id}
 */
export async function updateRoute(
  id: string,
  route: RouteRequest
): Promise<ApiResponse<RouteResponse>> {
  return apiFetch<ApiResponse<RouteResponse>>(`${ADMIN_ROUTES_API}/${id}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(route),
  });
}

/**
 * Partially update a route (Admin only)
 * PATCH /api/admin/routes/{id}
 */
export async function patchRoute(
  id: string,
  updates: Partial<RouteRequest>
): Promise<ApiResponse<RouteResponse>> {
  return apiFetch<ApiResponse<RouteResponse>>(`${ADMIN_ROUTES_API}/${id}`, {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a route (Admin only)
 * DELETE /api/admin/routes/{id}
 */
export async function deleteRoute(id: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(`${ADMIN_ROUTES_API}/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });
}

/**
 * Convert RouteFeature to RouteRequest for API submission
 */
export function featureToRouteRequest(
  feature: RouteFeature,
  additionalData?: Partial<RouteRequest>
): RouteRequest {
  const coords = feature.geometry.coordinates;

  // Calculate min/max altitude if coordinates have elevation
  let minAltitude = 0;
  let maxAltitude = 0;

  return {
    name: feature.properties.routeName,
    region: additionalData?.region || "Unknown",
    maxAltitude: maxAltitude || additionalData?.maxAltitude || 0,
    minAltitude: minAltitude || additionalData?.minAltitude,
    distanceKm: feature.properties.distance / 1000,
    geometryCoordinates: coords,
    difficultyLevel: additionalData?.difficultyLevel,
    description: additionalData?.description,
    isActive: true,
    ...additionalData,
  };
}
