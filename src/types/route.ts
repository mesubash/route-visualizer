export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Waypoint extends Coordinates {
  name?: string;
  order?: number;
}

// Difficulty levels from the API
export type DifficultyLevel =
  | "EASY"
  | "MODERATE"
  | "HARD"
  | "VERY_HARD"
  | "EXTREME";

// Rescue Category from the API
export interface RescueCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  baseCost: number;
  costPerKm: number;
  costPerAltitudeM: number;
}

// Route Summary Response - returned in list/search endpoints
export interface RouteSummaryResponse {
  id: string;
  name: string;
  region: string;
  trekName: string | null;
  maxAltitude: number;
  distanceKm: number | null;
  difficultyLevel: DifficultyLevel | null;
  isHighAltitude: boolean;
  hasGeometry: boolean;
  isActive: boolean;
}

// Route Response - full details returned in detail endpoints
export interface RouteResponse {
  id: string;
  name: string;
  abbreviation: string | null;
  trekName: string | null;
  description: string | null;
  region: string;
  minAltitude: number;
  maxAltitude: number;
  altitudeRange: number;
  durationDays: number | null;
  distanceKm: number | null;
  difficultyLevel: DifficultyLevel | null;
  geometryCoordinates: [number, number][] | null; // [lng, lat] pairs
  hasGeometry: boolean;
  rescueCategory: RescueCategory | null;
  estimatedRescueCost: number | null;
  isHighAltitude: boolean;
  isExtremeAltitude: boolean;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// Route Request - for creating/updating routes (full update)
export interface RouteRequest {
  name: string; // Required (3-255 chars)
  abbreviation?: string; // Optional (max 20 chars)
  trekName?: string; // Optional (max 150 chars)
  description?: string; // Optional
  region: string; // Required (max 100 chars)
  minAltitude: number; // Required (>= 0)
  maxAltitude: number; // Required (> 0)
  durationDays?: number; // Optional (> 0 if provided)
  distanceKm?: number; // Optional (> 0 if provided)
  difficultyLevel: DifficultyLevel; // Required
  geometryCoordinates: [number, number][]; // Required (min 2 points)
  rescueCategoryId?: string; // Optional (auto-assigned)
  estimatedRescueCost?: number; // Optional (>= 0)
  isActive?: boolean; // Optional (default: true)
  metadata?: Record<string, unknown>; // Optional
}

// Route Partial Update Request - for PATCH operations
export interface RoutePartialUpdateRequest {
  name?: string;
  abbreviation?: string;
  trekName?: string;
  description?: string;
  region?: string;
  minAltitude?: number;
  maxAltitude?: number;
  durationDays?: number;
  distanceKm?: number;
  difficultyLevel?: DifficultyLevel;
  geometryCoordinates?: [number, number][];
  rescueCategoryId?: string;
  estimatedRescueCost?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// Paginated response from the API
export interface PaginatedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

// Route Statistics - from GET /api/admin/routes/statistics
export interface RouteStatistics {
  totalRoutes: number;
  activeRoutes: number;
  inactiveRoutes: number;
  routesWithGeometry: number;
  routesWithoutGeometry: number;
  highAltitudeRoutes: number;
  extremeAltitudeRoutes: number;
  averageMaxAltitude: number;
  averageDuration: number;
  byRegion: Record<string, number>;
  byDifficulty: Record<DifficultyLevel, number>;
}

// Route Import Response - from import endpoints
export interface RouteImportResponse {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: string[];
}

// Search parameters for routes
export interface RouteSearchParams {
  search?: string;
  region?: string;
  difficultyLevel?: DifficultyLevel;
  minAltitude?: number;
  maxAltitude?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// Legacy types for backward compatibility with existing components
export interface RouteProperties {
  id: string;
  distance: number; // meters
  duration: number; // seconds
  routeName: string;
  roadType?: string;
  waypoints?: Waypoint[];
  createdAt?: string;
  color?: string;
  // Extended fields from API
  region?: string;
  minAltitude?: number;
  maxAltitude?: number;
  description?: string;
  trekName?: string;
  durationDays?: number;
  isActive?: boolean;
}

export interface RouteFeature {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat] pairs
  };
  properties: RouteProperties;
}

export interface RouteCollection {
  type: "FeatureCollection";
  features: RouteFeature[];
}

export interface RouteApiResponse {
  success: boolean;
  data: RouteCollection;
  error?: string;
}

export interface RouteInputState {
  origin: {
    lat: string;
    lng: string;
    name?: string;
  };
  destination: {
    lat: string;
    lng: string;
    name?: string;
  };
}

export type RouteStatus = "idle" | "loading" | "success" | "error";

export interface MapState {
  center: Coordinates;
  zoom: number;
}

// Utility type for converting GeoJSON coordinates to Leaflet format
export type LatLngTuple = [number, number]; // [lat, lng] for Leaflet

// Helper function to convert RouteResponse to RouteFeature for map display
export function routeResponseToFeature(route: RouteResponse): RouteFeature {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: route.geometryCoordinates || [],
    },
    properties: {
      id: route.id,
      distance: (route.distanceKm || 0) * 1000, // Convert km to meters
      duration: (route.durationDays || 0) * 24 * 3600, // Convert days to seconds
      routeName: route.name,
      roadType: route.difficultyLevel || "Unknown",
      createdAt: route.createdAt,
      // Extended fields
      region: route.region,
      minAltitude: route.minAltitude,
      maxAltitude: route.maxAltitude,
      description: route.description || undefined,
      trekName: route.trekName || undefined,
      durationDays: route.durationDays || undefined,
      isActive: route.isActive,
    },
  };
}

// ============================================
// Import/Export Types
// ============================================

// Route item for bulk import
export interface RouteImportItem {
  name: string;
  region: string;
  maxAltitude: number;
  abbreviation?: string;
  trekName?: string;
  description?: string;
  minAltitude?: number;
  durationDays?: number;
  distanceKm?: number;
  difficultyLevel?: string;
  geometryCoordinates?: number[][];
  rescueCategoryCode?: string;
  estimatedRescueCost?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// Response from bulk import operations
export interface BulkImportResponse {
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  totalProcessed: number;
  message: string;
  errors: string[];
  warnings: string[];
  importedRoutes: string[];
}

// Route data structure for exports
export interface RouteExportData {
  id: string;
  name: string;
  abbreviation?: string;
  trekName?: string;
  description?: string;
  region: string;
  minAltitude: number;
  maxAltitude: number;
  durationDays?: number;
  distanceKm?: number;
  difficultyLevel?: string;
  geometryCoordinates?: number[][];
  rescueCategoryCode?: string;
  estimatedRescueCost?: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}
