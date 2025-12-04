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
  RoutePartialUpdateRequest,
  RouteStatistics,
  RouteImportResponse,
  DifficultyLevel,
  routeResponseToFeature,
} from "@/types/route";
import { getAuthHeaders } from "@/lib/auth";

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
// PUBLIC LOOKUP ENDPOINTS (No Authentication Required)
// These endpoints may not exist on all backends, so we provide fallbacks
// ============================================

// Default difficulty levels (used as fallback)
const DEFAULT_DIFFICULTY_LEVELS = [
  "EASY",
  "MODERATE",
  "HARD",
  "VERY_HARD",
  "EXTREME",
];

/**
 * Get all regions (Public - for dropdowns)
 * Falls back to extracting from routes if endpoint doesn't exist
 */
export async function getPublicRegions(): Promise<ApiResponse<string[]>> {
  try {
    // Try to fetch from dedicated endpoint first
    const response = await fetch(`${ROUTES_API}/regions`);
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Endpoint doesn't exist, fall through to fallback
  }

  // Fallback: extract regions from all routes
  try {
    const routesResponse = await getAllRoutes();
    if (routesResponse.success && routesResponse.data) {
      const regions = [
        ...new Set(routesResponse.data.map((r) => r.region).filter(Boolean)),
      ].sort();
      return { success: true, data: regions };
    }
  } catch {
    // If that fails too, return empty
  }

  return { success: true, data: [] };
}

/**
 * Get trek names (Public - for dropdowns)
 * Falls back to extracting from routes if endpoint doesn't exist
 */
export async function getPublicTrekNames(
  region?: string
): Promise<ApiResponse<string[]>> {
  try {
    const queryString = region ? `?region=${encodeURIComponent(region)}` : "";
    const response = await fetch(`${ROUTES_API}/trek-names${queryString}`);
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Endpoint doesn't exist, fall through to fallback
  }

  // Fallback: extract trek names from all routes
  try {
    const routesResponse = await getAllRoutes();
    if (routesResponse.success && routesResponse.data) {
      let routes = routesResponse.data;
      if (region) {
        routes = routes.filter((r) => r.region === region);
      }
      const trekNames = [
        ...new Set(
          routes.map((r) => r.trekName).filter((t): t is string => !!t)
        ),
      ].sort();
      return { success: true, data: trekNames };
    }
  } catch {
    // If that fails too, return empty
  }

  return { success: true, data: [] };
}

/**
 * Get difficulty levels (Public - for dropdowns)
 * Falls back to default list if endpoint doesn't exist
 */
export async function getPublicDifficultyLevels(): Promise<
  ApiResponse<string[]>
> {
  try {
    const response = await fetch(`${ROUTES_API}/difficulty-levels`);
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Endpoint doesn't exist, fall through to fallback
  }

  // Fallback: return default difficulty levels
  return { success: true, data: DEFAULT_DIFFICULTY_LEVELS };
}

/**
 * Get routes by trek name (Public)
 * GET /api/routes/by-trek-name/{trekName}
 */
export async function getRoutesByTrekName(
  trekName: string
): Promise<ApiResponse<RouteSummaryResponse[]>> {
  try {
    const response = await fetch(
      `${ROUTES_API}/by-trek-name/${encodeURIComponent(trekName)}`
    );
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Endpoint doesn't exist
  }

  // Fallback: filter from all routes
  try {
    const routesResponse = await getAllRoutes();
    if (routesResponse.success && routesResponse.data) {
      const filtered = routesResponse.data.filter(
        (r) => r.trekName === trekName
      );
      return { success: true, data: filtered };
    }
  } catch {
    // If that fails too, return empty
  }

  return { success: true, data: [] };
}

// ============================================
// PUBLIC CRUD ENDPOINTS (Require ADMIN/STAFF Role)
// POST /api/routes, PUT /api/routes/{id}, DELETE /api/routes/{id}
// ============================================

/**
 * Create a new route (requires ADMIN or STAFF role)
 * POST /api/admin/routes
 */
export async function createRoute(
  route: RouteRequest
): Promise<ApiResponse<RouteResponse>> {
  console.log("createRoute called with:", route);
  const authHeaders = getAuthHeaders();

  // Check if we have auth headers
  if (!authHeaders.Authorization) {
    return {
      success: false,
      data: null as unknown as RouteResponse,
      message: "Not authenticated. Please log in again.",
    };
  }

  // Validate required fields before sending
  const validationErrors: string[] = [];
  if (!route.name || route.name.length < 3) {
    validationErrors.push("Route name must be at least 3 characters");
  }
  if (!route.region) {
    validationErrors.push("Region is required");
  }
  if (route.minAltitude === undefined || route.minAltitude < 0) {
    validationErrors.push("Minimum altitude must be 0 or positive");
  }
  if (!route.maxAltitude || route.maxAltitude <= 0) {
    validationErrors.push("Maximum altitude must be positive");
  }
  if (!route.difficultyLevel) {
    validationErrors.push("Difficulty level is required");
  }
  if (!route.geometryCoordinates || route.geometryCoordinates.length < 2) {
    validationErrors.push("At least 2 coordinate points are required");
  }

  if (validationErrors.length > 0) {
    return {
      success: false,
      data: null as unknown as RouteResponse,
      message: validationErrors.join(". "),
    };
  }

  try {
    console.log("Sending POST request to:", ADMIN_ROUTES_API);
    console.log("Request body:", JSON.stringify(route, null, 2));

    const response = await fetch(ADMIN_ROUTES_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(route),
    });

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", data);

    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        return {
          success: false,
          data: null as unknown as RouteResponse,
          message: "Session expired (401). Please log in again.",
        };
      }
      // Handle 403 Forbidden specifically
      if (response.status === 403) {
        return {
          success: false,
          data: null as unknown as RouteResponse,
          message: "Access denied. Admin or Staff role required.",
        };
      }
      // Handle validation errors from API
      let errorMessage = data.message || "Failed to create route";
      if (data.errors) {
        // If there's an errors object with field-specific messages
        const fieldErrors = Object.entries(data.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(". ");
        errorMessage = fieldErrors || errorMessage;
      }
      return {
        success: false,
        data: null as unknown as RouteResponse,
        message: errorMessage,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      data: null as unknown as RouteResponse,
      message:
        error instanceof Error ? error.message : "Failed to create route",
    };
  }
}

/**
 * Update an existing route (requires ADMIN or STAFF role)
 * PUT /api/admin/routes/{id}
 */
export async function updateRoute(
  id: string,
  route: RouteRequest
): Promise<ApiResponse<RouteResponse>> {
  const authHeaders = getAuthHeaders();

  // Check if we have auth headers
  if (!authHeaders.Authorization) {
    return {
      success: false,
      data: null as unknown as RouteResponse,
      message: "Not authenticated. Please log in again.",
    };
  }

  // Validate required fields before sending
  const validationErrors: string[] = [];
  if (!route.name || route.name.length < 3) {
    validationErrors.push("Route name must be at least 3 characters");
  }
  if (!route.region) {
    validationErrors.push("Region is required");
  }
  if (route.minAltitude === undefined || route.minAltitude < 0) {
    validationErrors.push("Minimum altitude must be 0 or positive");
  }
  if (!route.maxAltitude || route.maxAltitude <= 0) {
    validationErrors.push("Maximum altitude must be positive");
  }
  if (!route.difficultyLevel) {
    validationErrors.push("Difficulty level is required");
  }
  if (!route.geometryCoordinates || route.geometryCoordinates.length < 2) {
    validationErrors.push("At least 2 coordinate points are required");
  }

  if (validationErrors.length > 0) {
    return {
      success: false,
      data: null as unknown as RouteResponse,
      message: validationErrors.join(". "),
    };
  }

  try {
    const response = await fetch(`${ADMIN_ROUTES_API}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(route),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle validation errors from API
      let errorMessage = data.message || "Failed to update route";

      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        return {
          success: false,
          data: null as unknown as RouteResponse,
          message: "Session expired (401). Please log in again.",
        };
      }
      // Handle 403 Forbidden specifically
      if (response.status === 403) {
        return {
          success: false,
          data: null as unknown as RouteResponse,
          message: "Access denied. Admin or Staff role required.",
        };
      }

      if (data.errors) {
        const fieldErrors = Object.entries(data.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(". ");
        errorMessage = fieldErrors || errorMessage;
      }
      return {
        success: false,
        data: null as unknown as RouteResponse,
        message: errorMessage,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      data: null as unknown as RouteResponse,
      message:
        error instanceof Error ? error.message : "Failed to update route",
    };
  }
}

/**
 * Delete a route (requires ADMIN or STAFF role)
 * DELETE /api/admin/routes/{id}
 */
export async function deleteRoute(id: string): Promise<ApiResponse<void>> {
  console.log("deleteRoute called for id:", id);
  const authHeaders = getAuthHeaders();
  console.log("Auth headers:", authHeaders);

  // Check if we have auth headers
  if (!authHeaders.Authorization) {
    console.error("deleteRoute: No Authorization header - not authenticated");
    return {
      success: false,
      data: undefined as unknown as void,
      message: "Not authenticated. Please log in again.",
    } as ApiResponse<void>;
  }

  console.log("Making DELETE request to:", `${ADMIN_ROUTES_API}/${id}`);

  try {
    const response = await fetch(`${ADMIN_ROUTES_API}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
    });

    console.log("DELETE response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("DELETE failed:", response.status, errorData);

      if (response.status === 401) {
        return {
          success: false,
          data: undefined as unknown as void,
          message: "Session expired. Please log in again.",
        } as ApiResponse<void>;
      }
      if (response.status === 403) {
        return {
          success: false,
          data: undefined as unknown as void,
          message: "Access denied. Admin or Staff role required.",
        } as ApiResponse<void>;
      }
      return {
        success: false,
        data: undefined as unknown as void,
        message: errorData.message || `Failed to delete route`,
      } as ApiResponse<void>;
    }

    // Handle empty response (204 No Content) or JSON response
    const text = await response.text();
    console.log("DELETE response body:", text);

    if (!text) {
      return {
        success: true,
        data: undefined as unknown as void,
      } as ApiResponse<void>;
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        success: true,
        data: undefined as unknown as void,
      } as ApiResponse<void>;
    }
  } catch (error) {
    console.error("deleteRoute error:", error);
    return {
      success: false,
      data: undefined as unknown as void,
      message:
        error instanceof Error ? error.message : "Failed to delete route",
    } as ApiResponse<void>;
  }
}

// ============================================
// ADMIN API ENDPOINTS (Require ADMIN Role Only)
// ============================================

/**
 * Create a new route (Admin only)
 * POST /api/admin/routes
 */
export async function adminCreateRoute(
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
export async function adminUpdateRoute(
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
  updates: RoutePartialUpdateRequest
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
export async function adminDeleteRoute(id: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(`${ADMIN_ROUTES_API}/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });
}

/**
 * Toggle route status (Admin only)
 * PATCH /api/admin/routes/{id}/status?active=true|false
 */
export async function toggleRouteStatus(
  id: string,
  active: boolean
): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(
    `${ADMIN_ROUTES_API}/${id}/status?active=${active}`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Bulk toggle route status (Admin only)
 * PATCH /api/admin/routes/status/bulk?ids=uuid1,uuid2&active=true|false
 */
export async function bulkToggleRouteStatus(
  ids: string[],
  active: boolean
): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(
    `${ADMIN_ROUTES_API}/status/bulk?ids=${ids.join(",")}&active=${active}`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Get all regions (Admin only)
 * GET /api/admin/routes/regions
 */
export async function getRegions(): Promise<ApiResponse<string[]>> {
  return apiFetch<ApiResponse<string[]>>(`${ADMIN_ROUTES_API}/regions`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
}

/**
 * Get all difficulty levels (Admin only)
 * GET /api/admin/routes/difficulty-levels
 */
export async function getDifficultyLevels(): Promise<ApiResponse<string[]>> {
  return apiFetch<ApiResponse<string[]>>(
    `${ADMIN_ROUTES_API}/difficulty-levels`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Get route statistics (Admin only)
 * GET /api/admin/routes/statistics
 */
export async function getRouteStatistics(): Promise<
  ApiResponse<RouteStatistics>
> {
  return apiFetch<ApiResponse<RouteStatistics>>(
    `${ADMIN_ROUTES_API}/statistics`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Search routes with admin access (includes inactive routes)
 * GET /api/admin/routes
 */
export async function adminSearchRoutes(
  params: RouteSearchParams & { activeOnly?: boolean }
): Promise<ApiResponse<PaginatedResponse<RouteSummaryResponse>>> {
  const queryString = buildQueryString(params);
  const activeFilter =
    params.activeOnly !== undefined
      ? `${queryString ? "&" : "?"}activeOnly=${params.activeOnly}`
      : "";
  return apiFetch<ApiResponse<PaginatedResponse<RouteSummaryResponse>>>(
    `${ADMIN_ROUTES_API}${queryString}${activeFilter}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Get all routes (Admin - no pagination)
 * GET /api/admin/routes/all
 */
export async function adminGetAllRoutes(
  activeOnly?: boolean
): Promise<ApiResponse<RouteSummaryResponse[]>> {
  const queryString =
    activeOnly !== undefined ? `?activeOnly=${activeOnly}` : "";
  return apiFetch<ApiResponse<RouteSummaryResponse[]>>(
    `${ADMIN_ROUTES_API}/all${queryString}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Get route by ID (Admin - with full access)
 * GET /api/admin/routes/{id}
 */
export async function adminGetRouteById(
  id: string
): Promise<ApiResponse<RouteResponse>> {
  return apiFetch<ApiResponse<RouteResponse>>(`${ADMIN_ROUTES_API}/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
}

/**
 * Import routes from GeoJSON file (Admin only)
 * POST /api/admin/routes/import/geojson
 */
export async function importGeoJSON(
  file: File
): Promise<ApiResponse<RouteImportResponse>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${ADMIN_ROUTES_API}/import/geojson`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
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
 * Import routes from SQL file (Admin only)
 * POST /api/admin/routes/import/sql
 */
export async function importSQL(
  file: File
): Promise<ApiResponse<RouteImportResponse>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${ADMIN_ROUTES_API}/import/sql`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
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
 * Execute staging import (Admin only)
 * POST /api/admin/routes/import/execute-staging
 */
export async function executeStagingImport(): Promise<
  ApiResponse<RouteImportResponse>
> {
  return apiFetch<ApiResponse<RouteImportResponse>>(
    `${ADMIN_ROUTES_API}/import/execute-staging`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Get sample GeoJSON format (Admin only)
 * GET /api/admin/routes/sample/geojson
 */
export async function getSampleGeoJSON(): Promise<ApiResponse<unknown>> {
  return apiFetch<ApiResponse<unknown>>(`${ADMIN_ROUTES_API}/sample/geojson`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
}

/**
 * Get sample bulk import format (Admin only)
 * GET /api/admin/routes/sample/bulk-import
 */
export async function getSampleBulkImport(): Promise<ApiResponse<unknown>> {
  return apiFetch<ApiResponse<unknown>>(
    `${ADMIN_ROUTES_API}/sample/bulk-import`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
}

/**
 * Bulk import routes via JSON (Admin only)
 * POST /api/admin/routes/import/bulk
 */
export async function bulkImportRoutes(
  routes: RouteRequest[]
): Promise<ApiResponse<RouteImportResponse>> {
  return apiFetch<ApiResponse<RouteImportResponse>>(
    `${ADMIN_ROUTES_API}/import/bulk`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ routes }),
    }
  );
}

/**
 * Convert RouteFeature to RouteRequest for API submission
 * All required fields must be provided via additionalData for missing values
 */
export function featureToRouteRequest(
  feature: RouteFeature,
  additionalData: {
    region: string;
    minAltitude: number;
    maxAltitude: number;
    difficultyLevel: DifficultyLevel;
    name?: string;
    description?: string;
    trekName?: string;
    durationDays?: number;
  }
): RouteRequest {
  const coords = feature.geometry.coordinates;

  return {
    name: additionalData.name || feature.properties.routeName,
    region: additionalData.region,
    minAltitude: additionalData.minAltitude,
    maxAltitude: additionalData.maxAltitude,
    difficultyLevel: additionalData.difficultyLevel,
    geometryCoordinates: coords,
    distanceKm: feature.properties.distance / 1000,
    durationDays: additionalData.durationDays,
    description: additionalData.description,
    trekName: additionalData.trekName,
    isActive: true,
  };
}

/**
 * Create a minimal RouteRequest from coordinates
 * Used when drawing new routes
 */
export function createRouteRequest(
  name: string,
  coordinates: [number, number][],
  options: {
    region: string;
    minAltitude: number;
    maxAltitude: number;
    difficultyLevel: DifficultyLevel;
    description?: string;
    trekName?: string;
    durationDays?: number;
    distanceKm?: number;
  }
): RouteRequest {
  return {
    name,
    region: options.region,
    minAltitude: options.minAltitude,
    maxAltitude: options.maxAltitude,
    difficultyLevel: options.difficultyLevel,
    geometryCoordinates: coordinates,
    description: options.description,
    trekName: options.trekName,
    durationDays: options.durationDays,
    distanceKm: options.distanceKm,
    isActive: true,
  };
}
