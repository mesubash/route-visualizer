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

// Route Request - for creating/updating routes
export interface RouteRequest {
  name: string;
  abbreviation?: string;
  trekName?: string;
  description?: string;
  region: string;
  minAltitude?: number;
  maxAltitude: number;
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

// Route Statistics
export interface RouteStatistics {
  totalRoutes: number;
  activeRoutes: number;
  routesWithGeometry: number;
  highAltitudeRoutes: number;
  byRegion: Record<string, number>;
  byDifficulty: Record<DifficultyLevel, number>;
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
    },
  };
}
